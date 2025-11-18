"""Dashboard service for KPI summary and analytics."""
from datetime import date, datetime
from typing import Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..models.transaction import Transaction


class DashboardService:
    """Service for dashboard operations."""

    @staticmethod
    def get_summary(db: Session, month: Optional[str] = None) -> dict:
        """Get dashboard summary with current and previous month comparison.

        Args:
            db: Database session
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
        current_data = DashboardService._get_month_data(db, current_month_key)

        # Get previous month data
        previous_data = DashboardService._get_month_data(db, previous_month_key)

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
    def _get_month_data(db: Session, month_key: str) -> dict:
        """Get income, expense, and net for a specific month.

        Args:
            db: Database session
            month_key: Month in YYYY-MM format

        Returns:
            Dictionary with income, expense, and net
        """
        result = (
            db.query(
                func.sum(
                    case((Transaction.is_income, Transaction.amount), else_=0)
                ).label("income"),
                func.sum(
                    case((~Transaction.is_income, Transaction.amount), else_=0)
                ).label("expenses"),
            )
            .filter(~Transaction.is_transfer, Transaction.month_key == month_key)
            .first()
        )

        income = result.income or 0
        expense = abs(result.expenses or 0)
        net = income - expense

        return {"income": income, "expense": expense, "net": net}

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
