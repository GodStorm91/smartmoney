"""Analytics service facade — delegates to focused sub-modules.

Sub-modules:
- analytics_cashflow_service   : monthly trends, comprehensive summary
- analytics_category_service   : category breakdown, source breakdown, raw category spending
- analytics_insights_service   : spike detection, budget alerts, trend insights
- analytics_heatmap_service    : daily spending data for the heatmap widget
"""
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from .analytics_cashflow_service import CashflowAnalyticsService
from .analytics_category_service import CategoryAnalyticsService
from .analytics_insights_service import InsightsAnalyticsService
from .analytics_heatmap_service import HeatmapAnalyticsService


class AnalyticsService:
    """Facade preserving the original AnalyticsService API surface."""

    # -- Cashflow ----------------------------------------------------------

    @staticmethod
    def get_monthly_cashflow(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        return CashflowAnalyticsService.get_monthly_cashflow(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

    @staticmethod
    def get_monthly_trend(db: Session, user_id: int, months: int = 12) -> list[dict]:
        return CashflowAnalyticsService.get_monthly_trend(db=db, user_id=user_id, months=months)

    @staticmethod
    def get_comprehensive_analytics(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> dict:
        return CashflowAnalyticsService.get_comprehensive_analytics(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

    # -- Category / Source -------------------------------------------------

    @staticmethod
    def get_category_breakdown(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        return CategoryAnalyticsService.get_category_breakdown(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

    @staticmethod
    def get_sources_breakdown(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        return CategoryAnalyticsService.get_sources_breakdown(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

    @staticmethod
    def _get_category_spending(
        db: Session, user_id: int, start_date: date, end_date: date
    ) -> dict:
        return CategoryAnalyticsService.get_category_spending(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

    # -- Insights ----------------------------------------------------------

    @staticmethod
    def generate_spending_insights(db: Session, user_id: int) -> list[dict]:
        return InsightsAnalyticsService.generate_spending_insights(db=db, user_id=user_id)

    # -- Year-over-Year ----------------------------------------------------

    @staticmethod
    def get_year_over_year(db: Session, user_id: int) -> dict:
        return CashflowAnalyticsService.get_year_over_year(db=db, user_id=user_id)

    # -- Velocity ----------------------------------------------------------

    @staticmethod
    def get_spending_velocity(db: Session, user_id: int) -> dict:
        return CashflowAnalyticsService.get_spending_velocity(db=db, user_id=user_id)

    # -- Heatmap -----------------------------------------------------------

    @staticmethod
    def get_daily_spending(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> dict:
        return HeatmapAnalyticsService.get_daily_spending(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )
