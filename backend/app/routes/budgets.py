"""Budget API routes."""
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.budget import Budget
from ..models.user import User
from ..schemas.budget import (
    BudgetGenerateRequest,
    BudgetRegenerateRequest,
    BudgetResponse,
    BudgetTrackingResponse
)
from ..services.budget_service import BudgetService
from ..services.claude_ai_service import ClaudeAIService
from ..services.budget_tracking_service import BudgetTrackingService

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.post("/generate", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def generate_budget(
    request: BudgetGenerateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Generate new budget using Claude AI.

    Args:
        request: Budget generation request with monthly_income
        db: Database session
        current_user: Authenticated user

    Returns:
        Created budget

    Raises:
        HTTPException: If AI generation fails
    """
    try:
        # Initialize Claude AI service
        ai_service = ClaudeAIService()

        # Generate budget
        budget_data = ai_service.generate_budget(
            db=db,
            user_id=current_user.id,
            monthly_income=request.monthly_income,
            feedback=request.feedback,
            language=request.language
        )

        # Save to database
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

    except Exception as e:
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
    """Regenerate budget with user feedback.

    Args:
        budget_id: Budget ID to regenerate
        request: Regeneration request with feedback
        db: Database session
        current_user: Authenticated user

    Returns:
        New budget with feedback applied

    Raises:
        HTTPException: If budget not found or AI generation fails
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
        # Save feedback
        BudgetService.add_feedback(db, budget_id, request.feedback)

        # Regenerate using AI
        ai_service = ClaudeAIService()
        budget_data = ai_service.generate_budget(
            db=db,
            user_id=current_user.id,
            monthly_income=existing_budget.monthly_income,
            feedback=request.feedback,
            language=request.language
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

    except Exception as e:
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
