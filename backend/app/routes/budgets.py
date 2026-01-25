"""Budget API routes."""
from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.budget import Budget
from ..models.user import User
from ..schemas.budget import (
    BudgetGenerateRequest,
    BudgetRegenerateRequest,
    BudgetResponse,
    BudgetTrackingResponse,
    CategoryHistoryResponse
)
from ..services.budget_service import BudgetService
from ..services.claude_ai_service import ClaudeAIService
from ..services.budget_tracking_service import BudgetTrackingService
from ..services.credit_service import CreditService, InsufficientCreditsError

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.post("/generate", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def generate_budget(
    request: BudgetGenerateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Generate new budget using Claude AI with credit-based payment.

    Args:
        request: Budget generation request with monthly_income
        db: Database session
        current_user: Authenticated user

    Returns:
        Created budget

    Raises:
        HTTPException: If insufficient credits or AI generation fails
    """
    try:
        # Initialize services
        ai_service = ClaudeAIService()
        credit_service = CreditService(db)

        # Check credit balance before generating (estimate: 0.36 credits)
        account = credit_service.get_account(current_user.id)
        if account.balance < Decimal("0.36"):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits. Please purchase more credits to generate a budget."
            )

        # Generate budget with token tracking
        budget_data, usage = ai_service.generate_budget_with_tracking(
            db=db,
            user_id=current_user.id,
            monthly_income=request.monthly_income,
            feedback=request.feedback,
            language=request.language
        )

        # Calculate credit cost based on token usage
        # Pricing: $0.80/1M input, $4/1M output (with 100x markup)
        input_cost = Decimal(usage["input_tokens"]) * Decimal("0.080") / Decimal("1000")
        output_cost = Decimal(usage["output_tokens"]) * Decimal("0.400") / Decimal("1000")
        total_credits = input_cost + output_cost

        # Deduct credits (atomic transaction)
        try:
            credit_service.deduct_credits(
                user_id=current_user.id,
                amount=total_credits,
                transaction_type="usage",
                description=f"AI budget generation ({usage['input_tokens']} input + {usage['output_tokens']} output tokens)",
                extra_data={
                    "input_tokens": usage["input_tokens"],
                    "output_tokens": usage["output_tokens"],
                    "monthly_income": request.monthly_income
                }
            )
            db.commit()
        except InsufficientCreditsError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=str(e)
            )

        # Save budget to database
        current_month = date.today().strftime("%Y-%m")
        budget = BudgetService.create_budget(
            db=db,
            user_id=current_user.id,
            month=current_month,
            monthly_income=request.monthly_income,
            allocations=budget_data["allocations"],
            savings_target=budget_data.get("savings_target"),
            advice=budget_data.get("advice")
        )

        return budget

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate budget: {str(e)}"
        )


@router.get("/current", response_model=BudgetResponse)
def get_current_budget(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get current month's budget.

    Args:
        db: Database session
        current_user: Authenticated user

    Returns:
        Current budget or 404

    Raises:
        HTTPException: If no budget exists for current month
    """
    budget = BudgetService.get_current_budget(db, current_user.id)

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No budget found for current month"
        )

    return budget


@router.post("/{budget_id}/regenerate", response_model=BudgetResponse)
def regenerate_budget(
    budget_id: int,
    request: BudgetRegenerateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Regenerate budget with user feedback using credit-based payment.

    Args:
        budget_id: Budget ID to regenerate
        request: Regeneration request with feedback
        db: Database session
        current_user: Authenticated user

    Returns:
        New budget with feedback applied

    Raises:
        HTTPException: If budget not found, insufficient credits, or AI generation fails
    """
    # Verify budget exists and belongs to user
    existing_budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not existing_budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    try:
        # Initialize services
        ai_service = ClaudeAIService()
        credit_service = CreditService(db)

        # Check credit balance before regenerating
        account = credit_service.get_account(current_user.id)
        if account.balance < Decimal("0.36"):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits. Please purchase more credits to regenerate the budget."
            )

        # Save feedback
        BudgetService.add_feedback(db, budget_id, request.feedback)

        # Regenerate using AI with token tracking
        budget_data, usage = ai_service.generate_budget_with_tracking(
            db=db,
            user_id=current_user.id,
            monthly_income=existing_budget.monthly_income,
            feedback=request.feedback,
            language=request.language
        )

        # Calculate and deduct credits
        input_cost = Decimal(usage["input_tokens"]) * Decimal("0.080") / Decimal("1000")
        output_cost = Decimal(usage["output_tokens"]) * Decimal("0.400") / Decimal("1000")
        total_credits = input_cost + output_cost

        try:
            credit_service.deduct_credits(
                user_id=current_user.id,
                amount=total_credits,
                transaction_type="usage",
                description=f"AI budget regeneration ({usage['input_tokens']} input + {usage['output_tokens']} output tokens)",
                extra_data={
                    "input_tokens": usage["input_tokens"],
                    "output_tokens": usage["output_tokens"],
                    "budget_id": budget_id,
                    "feedback": request.feedback
                }
            )
            db.commit()
        except InsufficientCreditsError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=str(e)
            )

        # Create new budget (replaces existing for same month)
        budget = BudgetService.create_budget(
            db=db,
            user_id=current_user.id,
            month=existing_budget.month,
            monthly_income=existing_budget.monthly_income,
            allocations=budget_data["allocations"],
            savings_target=budget_data.get("savings_target"),
            advice=budget_data.get("advice")
        )

        return budget

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate budget: {str(e)}"
        )


@router.get("/history", response_model=list[BudgetResponse])
def get_budget_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 12
):
    """Get budget history for user.

    Args:
        db: Database session
        current_user: Authenticated user
        limit: Maximum budgets to return (default 12)

    Returns:
        List of budgets ordered by month desc
    """
    budgets = BudgetService.get_budget_history(db, current_user.id, limit)
    return budgets


@router.get("/{month}", response_model=BudgetResponse)
def get_budget_by_month(
    month: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get budget for specific month.

    Args:
        month: Month string (YYYY-MM format)
        db: Database session
        current_user: Authenticated user

    Returns:
        Budget for specified month

    Raises:
        HTTPException: If budget not found
    """
    budget = BudgetService.get_budget_by_month(db, current_user.id, month)

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No budget found for month {month}"
        )

    return budget


@router.get("/tracking/current", response_model=BudgetTrackingResponse)
def get_current_budget_tracking(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get current month's budget tracking with spending data.

    Args:
        db: Database session
        current_user: Authenticated user

    Returns:
        Budget tracking with spending vs budget

    Raises:
        HTTPException: If no budget exists
    """
    tracking = BudgetTrackingService.get_budget_tracking(db, current_user.id)

    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No budget found for current month"
        )

    return tracking


@router.post("/alerts/check")
def check_budget_alerts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Check budget thresholds and send email alerts if needed.

    Args:
        db: Database session
        current_user: Authenticated user

    Returns:
        Alert check results
    """
    result = BudgetTrackingService.check_and_send_alerts(
        db,
        current_user.id,
        current_user.email
    )
    return result


@router.get("/category-history/{category}", response_model=CategoryHistoryResponse)
def get_category_spending_history(
    category: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    months: int = Query(default=3, ge=1, le=12)
):
    """Get daily spending history for a category.

    Used for ML-lite prediction calculations.

    Args:
        category: Category name
        db: Database session
        current_user: Authenticated user
        months: Number of months to look back (1-12, default 3)

    Returns:
        Historical spending data with daily/monthly aggregates
    """
    result = BudgetTrackingService.get_category_history(
        db,
        current_user.id,
        category,
        months
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No spending history found for category {category}"
        )

    return result
