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
    CategoryHistoryResponse,
    BudgetCopyRequest,
    BudgetCopyPreview,
    AllocationSpendingSummary,
    BudgetVersionResponse
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


@router.get("/latest", response_model=BudgetResponse)
def get_latest_budget(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get the most recent active budget (any month).

    Returns:
        Most recent budget or 404
    """
    budget = BudgetService.get_latest_budget(db, current_user.id)

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No budgets found"
        )

    return budget


@router.post("/copy", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def copy_budget(
    request: BudgetCopyRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Copy budget from one month to another.

    Args:
        request: Copy request with source and target months
        db: Database session
        current_user: Authenticated user

    Returns:
        Newly created budget
    """
    try:
        budget = BudgetService.copy_budget(
            db=db,
            user_id=current_user.id,
            source_month=request.source_month,
            target_month=request.target_month,
            monthly_income=request.monthly_income
        )
        return budget
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to copy budget: {str(e)}"
        )


@router.get("/copy/preview", response_model=BudgetCopyPreview)
def preview_budget_copy(
    source_month: str,
    target_month: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Preview budget copy with spending data from source month.

    Args:
        source_month: Month to copy from (YYYY-MM)
        target_month: Month to copy to (YYYY-MM)
        db: Database session
        current_user: Authenticated user

    Returns:
        Preview with source budget and spending summary
    """
    # Get source budget
    source_budget = BudgetService.get_budget_by_month(db, current_user.id, source_month)
    if not source_budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No budget found for month {source_month}"
        )

    # Get spending data for source month
    tracking = BudgetTrackingService.get_budget_tracking(
        db, current_user.id, month=source_month
    )

    # Build spending summary
    spending_summary = []
    if tracking:
        for item in tracking.get("categories", []):
            spending_summary.append(AllocationSpendingSummary(
                category=item["category"],
                budgeted=item["budgeted"],
                spent=item["spent"],
                remaining=item["remaining"],
                over_budget=item["spent"] > item["budgeted"]
            ))
    else:
        # No tracking data, just use allocations with 0 spent
        for alloc in source_budget.allocations:
            spending_summary.append(AllocationSpendingSummary(
                category=alloc.category,
                budgeted=alloc.amount,
                spent=0,
                remaining=alloc.amount,
                over_budget=False
            ))

    return BudgetCopyPreview(
        source_budget=source_budget,
        target_month=target_month,
        spending_summary=spending_summary
    )


@router.get("/{month}/versions", response_model=list[BudgetVersionResponse])
def get_budget_versions(
    month: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get all versions of a budget for a specific month.

    Args:
        month: Month string (YYYY-MM)
        db: Database session
        current_user: Authenticated user

    Returns:
        List of all budget versions for the month
    """
    versions = BudgetService.get_versions(db, current_user.id, month)

    return [
        BudgetVersionResponse(
            id=v.id,
            version=v.version,
            is_active=v.is_active,
            created_at=v.created_at,
            monthly_income=v.monthly_income,
            total_allocated=sum(a.amount for a in v.allocations),
            copied_from_id=v.copied_from_id
        )
        for v in versions
    ]


@router.post("/{budget_id}/restore", response_model=BudgetResponse)
def restore_budget_version(
    budget_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Restore a previous budget version as active.

    Args:
        budget_id: Budget ID to restore
        db: Database session
        current_user: Authenticated user

    Returns:
        Restored budget
    """
    try:
        budget = BudgetService.restore_version(db, current_user.id, budget_id)
        return budget
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
