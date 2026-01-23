"""Chat API routes for AI financial assistant."""
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.chat import ChatRequest, ChatResponse
from ..services.claude_ai_service import ClaudeAIService
from ..services.credit_service import CreditService, InsufficientCreditsError

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Cost per chat message in credits
CHAT_CREDIT_COST = Decimal("1.0000")


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Chat with AI about financial data.

    Consumes 1 credit per message. Returns AI response with optional
    suggested action (create_goal, create_budget).

    Args:
        request: Chat request with messages and language
        db: Database session
        current_user: Authenticated user

    Returns:
        AI response with optional suggested action

    Raises:
        HTTPException: 402 if insufficient credits
    """
    credit_service = CreditService(db)

    # Check credits before processing
    balance = credit_service.get_balance(current_user.id)
    if balance < CHAT_CREDIT_COST:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please purchase more credits to continue chatting."
        )

    # Build financial context and call AI
    ai_service = ClaudeAIService()
    try:
        response_data, usage = ai_service.chat_with_context(
            db=db,
            user_id=current_user.id,
            messages=[{"role": m.role, "content": m.content} for m in request.messages],
            language=request.language
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}"
        )

    # Deduct credit after successful response
    try:
        credit_service.deduct_credits(
            user_id=current_user.id,
            amount=CHAT_CREDIT_COST,
            transaction_type="usage",
            description="AI Chat - 1 message",
            extra_data={
                "feature": "chat",
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0)
            }
        )
        db.commit()
    except InsufficientCreditsError:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits"
        )

    # Get updated balance
    new_balance = credit_service.get_balance(current_user.id)

    return ChatResponse(
        message=response_data["message"],
        suggested_action=response_data.get("action"),
        credits_remaining=float(new_balance)
    )
