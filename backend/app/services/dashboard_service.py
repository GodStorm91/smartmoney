"""Dashboard service for KPI summary and analytics."""

from datetime import date, datetime
from typing import Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from .exchange_rate_service import ExchangeRateService


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
            Dictionary with income, expense, net, and change percentages (normalized to JPY)
        """
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Determine target month
        if month:
            current_month = datetime.strptime(month, "%Y-%m").date().replace(day=1)
        else:
            current_month = date.today().replace(day=1)

        previous_month = current_month - relativedelta(months=1)

        # Format month keys
        current_month_key = current_month.strftime("%Y-%m")
        previous_month_key = previous_month.strftime("%Y-%m")

        # Get current month data with currency conversion
        current_data = DashboardService._get_month_data(db, user_id, current_month_key, rates)

        # Get previous month data with currency conversion
        previous_data = DashboardService._get_month_data(db, user_id, previous_month_key, rates)

        # Calculate percentage changes
        income_change = DashboardService._calculate_change(
            previous_data["income"], current_data["income"]
        )
        expense_change = DashboardService._calculate_change(
            previous_data["expense"], current_data["expense"]
        )
        net_change = DashboardService._calculate_change(previous_data["net"], current_data["net"])

        return {
            "income": current_data["income"],
            "expense": current_data["expense"],
            "net": current_data["net"],
            "income_change": income_change,
            "expense_change": expense_change,
            "net_change": net_change,
            "transaction_count": current_data["transaction_count"],
        }

    @staticmethod
    def _convert_to_jpy(amount: int, currency: str, rates: dict[str, float]) -> int:
        """Convert amount to JPY using exchange rates.

        Args:
            amount: Amount in original currency (USD stored in cents, others as-is)
            currency: Currency code (JPY, USD, VND)
            rates: Exchange rates dict {currency: rate_to_jpy}

        Returns:
            Amount converted to JPY
        """
        if currency == "JPY" or currency not in rates:
            return amount
        rate = rates.get(currency, 1.0)
        if rate == 0:
            return amount

        # USD is stored in cents, convert to dollars first
        actual_amount = amount / 100 if currency == "USD" else amount

        # rate_to_jpy means "how many units of currency per 1 JPY"
        # So to convert to JPY: amount / rate
        return int(actual_amount / rate)

    @staticmethod
    def _get_month_data(db: Session, user_id: int, month_key: str, rates: dict[str, float]) -> dict:
        """Get income, expense, and net for a specific month with currency conversion.

        Args:
            db: Database session
            user_id: User ID
            month_key: Month in YYYY-MM format
            rates: Exchange rates dict for currency conversion

        Returns:
            Dictionary with income, expense, and net (normalized to JPY)
        """
        # Query transactions with currency for proper conversion
        transactions = (
            db.query(Transaction.amount, Transaction.currency, Transaction.is_income)
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                Transaction.month_key == month_key,
            )
            .all()
        )

        # Convert and sum by type
        income = 0
        expense = 0
        for tx in transactions:
            amount_jpy = DashboardService._convert_to_jpy(
                abs(tx.amount), tx.currency or "JPY", rates
            )
            if tx.is_income:
                income += amount_jpy
            else:
                expense += amount_jpy

        return {
            "income": income,
            "expense": expense,
            "net": income - expense,
            "transaction_count": len(transactions),
        }

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
