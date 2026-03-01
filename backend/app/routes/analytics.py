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
    SpendingInsightsResponse,
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
        user_id=current_user.id,
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
        user_id=current_user.id,
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
        user_id=current_user.id,
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
    return AnalyticsService.get_monthly_trend(db=db, user_id=current_user.id, months=months)


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
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/insights", response_model=SpendingInsightsResponse)
async def get_spending_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get smart spending insights.

    Returns:
        Spending insights with pattern detection, budget alerts, and trends
    """
    from datetime import datetime

    insights = AnalyticsService.generate_spending_insights(
        db=db,
        user_id=current_user.id,
    )
    return {
        "insights": insights,
        "generated_at": datetime.now().isoformat(),
    }


@router.get("/velocity")
async def get_spending_velocity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current month spending velocity (daily burn rate)."""
    return AnalyticsService.get_spending_velocity(db=db, user_id=current_user.id)


@router.get("/yoy")
async def get_year_over_year(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get year-over-year monthly comparison."""
    return AnalyticsService.get_year_over_year(db=db, user_id=current_user.id)


@router.get("/daily")
async def get_daily_spending(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get daily spending data for heatmap visualization."""
    return AnalyticsService.get_daily_spending(
        db=db, user_id=current_user.id, start_date=start_date, end_date=end_date
    )


@router.get("/forecast")
async def get_cashflow_forecast(
    months: int = Query(6, ge=1, le=24, description="Number of months to forecast"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get cash flow forecast with actual + projected months."""
    from ..services.forecast_service import ForecastService

    return ForecastService.get_cashflow_forecast(
        db=db,
        user_id=current_user.id,
        months=months,
    )
