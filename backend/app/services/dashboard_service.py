"""Dashboard service for KPI summary and analytics."""
from datetime import date, datetime
from typing import Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


class DashboardService:
    """Service for dashboard operations."""

    @staticmethod
    def get_summary(db: Session, user_id: int, month: Optional[str] = None) -> dict:
        """Get dashboard summary with current and previous month comparison.

        Args:
            db: Database session
            user_id: User ID
            month: Month in YYYY-MM format (defaults to current month)

        Returns:
            Dictionary with income, expense, net, and change percentages
        """
        # Determine target month
        if month:
            current_month = datetime.strptime(month, "%Y-%m").date().replace(day=1)
        else:
            current_month = date.today().replace(day=1)

        previous_month = current_month - relativedelta(months=1)

        # Format month keys
        current_month_key = current_month.strftime("%Y-%m")
        previous_month_key = previous_month.strftime("%Y-%m")

        # Get current month data
        current_data = DashboardService._get_month_data(db, user_id, current_month_key)

        # Get previous month data
        previous_data = DashboardService._get_month_data(db, user_id, previous_month_key)

        # Calculate percentage changes
        income_change = DashboardService._calculate_change(
            previous_data["income"], current_data["income"]
        )
        expense_change = DashboardService._calculate_change(
            previous_data["expense"], current_data["expense"]
        )
        net_change = DashboardService._calculate_change(
            previous_data["net"], current_data["net"]
        )

        return {
            "income": current_data["income"],
            "expense": current_data["expense"],
            "net": current_data["net"],
            "income_change": income_change,
            "expense_change": expense_change,
            "net_change": net_change,
        }

    @staticmethod
    def _get_month_data(db: Session, user_id: int, month_key: str) -> dict:
        """Get income, expense, and net for a specific month (converted to JPY).

        Args:
            db: Database session
            user_id: User ID
            month_key: Month in YYYY-MM format

        Returns:
            Dictionary with income, expense, and net (in JPY)
        """
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Query individual transactions to convert currencies
        results = (
            db.query(
                Transaction.amount,
                Transaction.currency,
                Transaction.is_income
            )
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                Transaction.month_key == month_key
            )
            .all()
        )

        income = 0
        expense = 0
        for row in results:
            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            if row.is_income:
                income += amount_jpy
            else:
                expense += amount_jpy

        return {"income": income, "expense": expense, "net": income - expense}

    @staticmethod
    def _calculate_change(previous: int, current: int) -> float:
        """Calculate percentage change between two values.

        Args:
            previous: Previous period value
            current: Current period value

        Returns:
            Percentage change (0.0 if previous is 0)
        """
        if previous == 0:
            return 0.0 if current == 0 else 100.0

        return round(((current - previous) / previous) * 100, 1)
