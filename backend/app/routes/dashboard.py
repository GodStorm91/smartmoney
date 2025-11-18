"""Dashboard API routes."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.dashboard import DashboardSummaryResponse
from ..services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    month: Optional[str] = Query(
        None, description="Month in YYYY-MM format (defaults to current month)"
    ),
    db: Session = Depends(get_db),
):
    """Get dashboard summary KPIs with month-over-month comparison.

    Returns:
        Dashboard summary with income, expense, net, and change percentages
    """
    return DashboardService.get_summary(db=db, month=month)
