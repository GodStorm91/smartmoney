"""Budget alerts API routes."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.budget_alert import (
    BudgetAlertListResponse,
    BudgetAlertResponse,
    BudgetThresholdStatusResponse,
    MarkAllAlertsReadResponse,
)
from ..services.budget_alert_service import BudgetAlertService
from ..services.budget_service import BudgetService

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("/alerts", response_model=BudgetAlertListResponse)
def get_budget_alerts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    unread_only: bool = Query(False, description="Only return unread alerts"),
    limit: int = Query(50, ge=1, le=100),
):
    """Get budget alerts for the current user."""
    alerts, total_count, unread_count = BudgetAlertService.get_alerts(
        db, current_user.id, unread_only, limit
    )

    return {
        "success": True,
        "data": {"alerts": alerts, "total_count": total_count, "unread_count": unread_count},
        "alerts": alerts,
        "total_count": total_count,
        "unread_count": unread_count,
    }


@router.get("/alerts/{alert_id}/read", response_model=BudgetAlertResponse)
def mark_alert_as_read(
    alert_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Mark a budget alert as read."""
    alert = BudgetAlertService.mark_as_read(db, alert_id, current_user.id)

    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    return alert


@router.put("/alerts/read-all", response_model=MarkAllAlertsReadResponse)
def mark_all_alerts_as_read(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Mark all budget alerts as read."""
    updated_count = BudgetAlertService.mark_all_as_read(db, current_user.id)

    return {"success": True, "updated_count": updated_count}


@router.get("/{budget_id}/threshold-status", response_model=BudgetThresholdStatusResponse)
def get_budget_threshold_status(
    budget_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get detailed threshold status for a budget."""
    status_data = BudgetAlertService.get_threshold_status(db, current_user.id, budget_id)

    if not status_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")

    return status_data
