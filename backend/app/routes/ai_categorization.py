"""AI-powered transaction categorization routes."""
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.transaction import Transaction
from ..models.user import User
from ..services.claude_ai_service import ClaudeAIService
from ..services.credit_service import CreditService, InsufficientCreditsError
from ..services.category_rule_service import CategoryRuleService

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Default expense categories
DEFAULT_CATEGORIES = [
    "Food", "Housing", "Transportation", "Utilities", "Communication",
    "Entertainment", "Shopping", "Health", "Other", "Groceries",
    "Dining", "Cafe", "Convenience", "Clothing", "Investment", "Transfer"
]


class CategorizeSuggestionsRequest(BaseModel):
    """Request for AI categorization suggestions."""
    limit: int = Field(default=50, ge=1, le=100, description="Max transactions to categorize")
    language: str = Field(default="ja", description="Language for suggestions")


class CategorySuggestion(BaseModel):
    """Single category suggestion."""
    transaction_id: int
    description: str
    amount: int
    current_category: str
    suggested_category: str
    confidence: float
    reason: str
    is_new_category: bool = False


class CategorizeSuggestionsResponse(BaseModel):
    """Response with AI categorization suggestions."""
    suggestions: list[CategorySuggestion]
    total_other_count: int
    credits_used: float
    new_categories_suggested: list[str]


class ApplySuggestionsRequest(BaseModel):
    """Request to apply approved suggestions."""
    approved: list[dict] = Field(description="List of {transaction_id, category} to apply")
    create_rules: bool = Field(default=True, description="Auto-create category rules")


class ApplySuggestionsResponse(BaseModel):
    """Response after applying suggestions."""
    updated_count: int
    rules_created: int
    failed_ids: list[int]


@router.post("/categorize/suggestions", response_model=CategorizeSuggestionsResponse)
def get_categorization_suggestions(
    request: CategorizeSuggestionsRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get AI-powered categorization suggestions for 'Other' transactions.

    Args:
        request: Request with limit and language
        db: Database session
        current_user: Authenticated user

    Returns:
        List of category suggestions with confidence scores

    Raises:
        HTTPException: If insufficient credits or AI fails
    """
    # Get transactions categorized as 'Other'
    other_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category == "Other",
        Transaction.is_income == False,
        Transaction.is_transfer == False,
        Transaction.is_adjustment == False,
    ).order_by(Transaction.date.desc()).limit(request.limit).all()

    total_other_count = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category == "Other",
    ).count()

    if not other_transactions:
        return CategorizeSuggestionsResponse(
            suggestions=[],
            total_other_count=0,
            credits_used=0,
            new_categories_suggested=[]
        )

    # Check credits before calling AI
    credit_service = CreditService(db)
    account = credit_service.get_account(current_user.id)
    estimated_cost = Decimal("0.50")  # Estimate ~0.5 credits for categorization

    if account.balance < estimated_cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please purchase more credits."
        )

    # Get user's custom categories
    from ..models.user_category import UserCategory
    user_categories = db.query(UserCategory.name).filter(
        UserCategory.user_id == current_user.id,
        UserCategory.type == "expense"
    ).all()
    custom_category_names = [uc.name for uc in user_categories]

    # Combine default and custom categories
    available_categories = list(set(DEFAULT_CATEGORIES + custom_category_names))

    # Prepare transaction data for AI
    tx_data = [
        {"id": tx.id, "description": tx.description, "amount": tx.amount}
        for tx in other_transactions
    ]

    # Call AI service
    try:
        ai_service = ClaudeAIService()
        results, usage = ai_service.categorize_transactions(
            transactions=tx_data,
            available_categories=available_categories,
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
                description=f"AI categorization ({usage['input_tokens']} input + {usage['output_tokens']} output tokens)",
                extra_data={
                    "input_tokens": usage["input_tokens"],
                    "output_tokens": usage["output_tokens"],
                    "transactions_analyzed": len(tx_data)
                }
            )
            db.commit()
        except InsufficientCreditsError as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=str(e)
            )

        # Build response with suggestions
        tx_map = {tx.id: tx for tx in other_transactions}
        suggestions = []
        new_categories = set()

        for result in results:
            tx_id = result.get("id")
            if tx_id not in tx_map:
                continue

            tx = tx_map[tx_id]
            category = result.get("category", "Other")
            is_new = category.startswith("NEW:")

            if is_new:
                category = category[4:]  # Remove "NEW:" prefix
                new_categories.add(category)

            suggestions.append(CategorySuggestion(
                transaction_id=tx_id,
                description=tx.description,
                amount=tx.amount,
                current_category="Other",
                suggested_category=category,
                confidence=result.get("confidence", 0.5),
                reason=result.get("reason", ""),
                is_new_category=is_new
            ))

        return CategorizeSuggestionsResponse(
            suggestions=suggestions,
            total_other_count=total_other_count,
            credits_used=float(total_credits),
            new_categories_suggested=list(new_categories)
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI categorization failed: {str(e)}"
        )


@router.post("/categorize/apply", response_model=ApplySuggestionsResponse)
def apply_categorization_suggestions(
    request: ApplySuggestionsRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Apply approved categorization suggestions.

    Args:
        request: Approved suggestions to apply
        db: Database session
        current_user: Authenticated user

    Returns:
        Count of updated transactions and created rules
    """
    updated_count = 0
    rules_created = 0
    failed_ids = []

    # Track descriptions for rule creation
    description_to_category = {}

    for item in request.approved:
        tx_id = item.get("transaction_id")
        category = item.get("category")

        if not tx_id or not category:
            continue

        # Update transaction
        tx = db.query(Transaction).filter(
            Transaction.id == tx_id,
            Transaction.user_id == current_user.id
        ).first()

        if tx:
            description_to_category[tx.description] = category
            tx.category = category
            updated_count += 1
        else:
            failed_ids.append(tx_id)

    # Create category rules if requested
    if request.create_rules and description_to_category:
        from ..models.category_rule import CategoryRule

        # Track keywords we're adding in this batch to avoid duplicates
        pending_keywords = set()

        for description, category in description_to_category.items():
            # Extract keyword from description (first significant word)
            keyword = description.split()[0] if " " in description else description

            if len(keyword) < 2:
                continue

            # Skip if we already added this keyword in this batch
            if keyword in pending_keywords:
                continue

            # Check if rule already exists in database
            existing = db.query(CategoryRule).filter(
                CategoryRule.user_id == current_user.id,
                CategoryRule.keyword == keyword
            ).first()

            if not existing:
                rule = CategoryRule(
                    user_id=current_user.id,
                    keyword=keyword,
                    category=category,
                    match_type="contains",
                    priority=5,
                    is_active=True
                )
                db.add(rule)
                pending_keywords.add(keyword)
                rules_created += 1

    try:
        db.commit()
    except Exception:
        db.rollback()
        # Still return success for transaction updates, just no rules created
        rules_created = 0

    return ApplySuggestionsResponse(
        updated_count=updated_count,
        rules_created=rules_created,
        failed_ids=failed_ids
    )
