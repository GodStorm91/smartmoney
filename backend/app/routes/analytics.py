"""Analytics API routes."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.analytics import (
    AnalyticsResponse,
    CategoryBreakdownResponse,
    MonthlyCashflowResponse,
    SourceBreakdownResponse,
)
from ..services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive analytics data.

    Returns:
        Complete analytics with monthly trends, category breakdown, and totals
    """
    return AnalyticsService.get_comprehensive_analytics(
        db=db,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/monthly", response_model=list[MonthlyCashflowResponse])
async def get_monthly_cashflow(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly cashflow data."""
    return AnalyticsService.get_monthly_cashflow(
        db=db,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/categories", response_model=list[CategoryBreakdownResponse])
async def get_category_breakdown(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get category breakdown for expenses."""
    return AnalyticsService.get_category_breakdown(
        db=db,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/trend", response_model=list[MonthlyCashflowResponse])
async def get_monthly_trend(
    months: int = Query(12, ge=1, le=60, description="Number of months to include"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly trend for last N months."""
    return AnalyticsService.get_monthly_trend(db=db, months=months)


@router.get("/sources", response_model=list[SourceBreakdownResponse])
async def get_sources_breakdown(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get transaction breakdown by source."""
    return AnalyticsService.get_sources_breakdown(
        db=db,
        start_date=start_date,
        end_date=end_date,
    )
