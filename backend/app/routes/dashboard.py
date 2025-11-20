"""Dashboard API routes."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.dashboard import DashboardSummaryResponse
from ..services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    month: Optional[str] = Query(
        None, description="Month in YYYY-MM format (defaults to current month)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard summary KPIs with month-over-month comparison.

    Returns:
        Dashboard summary with income, expense, net, and change percentages
    """
    return DashboardService.get_summary(db=db, user_id=current_user.id, month=month)
