"""Forecast service for multi-month cash flow projections."""
from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..models.account import Account
from ..models.recurring_transaction import RecurringTransaction
from ..models.transaction import Transaction
from .account_service import AccountService
from .exchange_rate_service import ExchangeRateService


class ForecastService:
    """Service for cash flow forecasting."""

    @staticmethod
    def get_cashflow_forecast(
        db: Session,
        user_id: int,
        months: int = 6,
        include_actual: int = 2
    ) -> dict:
        """Generate multi-month cash flow forecast.

        Args:
            db: Database session
            user_id: User ID
            months: Number of future months to forecast
            include_actual: Number of past actual months to include

        Returns:
            Forecast data with actual + projected months
        """
        today = date.today()
        current_month_start = today.replace(day=1)

        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # 1. Calculate current total balance (all accounts)
        current_balance = ForecastService._get_total_balance(db, user_id, rates)

        # 2. Get actual historical months
        actual_months = ForecastService._get_actual_months(
            db, user_id, include_actual, rates
        )

        # 3. Calculate average variable spending
        avg_variable = ForecastService._calculate_avg_variable_expense(
            db, user_id, lookback_months=3, rates=rates
        )

        # 4. Get active recurring transactions
        recurring_txns = db.query(RecurringTransaction).filter(
            RecurringTransaction.user_id == user_id,
            RecurringTransaction.is_active == True
        ).all()

        # 5. Generate projected months
        projected_months = []
        running_balance = current_balance

        for i in range(months):
            # Calculate target month
            target_month = current_month_start.month + i
            target_year = current_month_start.year

            while target_month > 12:
                target_month -= 12
                target_year += 1

            month_key = f"{target_year}-{target_month:02d}"

            # Get recurring for this month
            recurring_income, recurring_expense = ForecastService._get_recurring_for_month(
                recurring_txns, target_year, target_month, rates
            )

            # Project income (use recurring income as base)
            projected_income = recurring_income

            # Project expense (recurring + variable)
            projected_expense = recurring_expense + avg_variable

            # Calculate net
            projected_net = projected_income - projected_expense
            running_balance += projected_net

            projected_months.append({
                "month": month_key,
                "income": projected_income,
                "expense": projected_expense,
                "net": projected_net,
                "balance": running_balance,
                "is_actual": False,
                "recurring_income": recurring_income,
                "recurring_expense": recurring_expense,
                "variable_expense": avg_variable,
            })

        # Combine actual + projected
        all_months = actual_months + projected_months

        # Calculate summary
        projected_only = [m for m in all_months if not m["is_actual"]]
        total_projected_income = sum(m["income"] for m in projected_only)
        total_projected_expense = sum(m["expense"] for m in projected_only)
        avg_monthly_net = (
            sum(m["net"] for m in projected_only) // len(projected_only)
            if projected_only else 0
        )

        # Check for negative balance
        months_until_negative = None
        for i, m in enumerate(projected_only):
            if m["balance"] < 0:
                months_until_negative = i + 1
                break

        return {
            "current_balance": current_balance,
            "months": all_months,
            "summary": {
                "avg_monthly_net": avg_monthly_net,
                "end_balance": running_balance,
                "months_until_negative": months_until_negative,
                "total_projected_income": total_projected_income,
                "total_projected_expense": total_projected_expense,
            }
        }

    @staticmethod
    def _get_total_balance(db: Session, user_id: int, rates: dict) -> int:
        """Get total balance across all active accounts in JPY."""
        accounts = AccountService.get_all_accounts(db, user_id, include_inactive=False)

        total_balance = 0
        for account in accounts:
            balance = AccountService.calculate_balance(db, user_id, account.id)
            # Convert to JPY if needed
            balance_jpy = ForecastService._convert_to_jpy(balance, account.currency, rates)
            total_balance += balance_jpy

        return total_balance

    @staticmethod
    def _convert_to_jpy(amount: int, currency: str, rates: dict) -> int:
        """Convert amount to JPY."""
        if currency == "JPY" or currency not in rates:
            return amount

        rate = rates.get(currency, 1.0)
        if rate == 0:
            return amount

        # USD stored in cents
        actual_amount = amount / 100 if currency == "USD" else amount
        return int(actual_amount / rate)

    @staticmethod
    def _get_actual_months(
        db: Session,
        user_id: int,
        num_months: int,
        rates: dict
    ) -> list[dict]:
        """Get actual historical month data."""
        today = date.today()

        # Calculate start date for lookback
        start_month = today.month - num_months
        start_year = today.year
        while start_month < 1:
            start_month += 12
            start_year -= 1

        start_date = date(start_year, start_month, 1)
        end_date = today.replace(day=1) - timedelta(days=1)  # Last day of previous month

        # Query transactions grouped by month
        results = (
            db.query(
                Transaction.month_key,
                Transaction.amount,
                Transaction.currency,
                Transaction.is_income,
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= start_date,
                Transaction.date <= end_date,
                ~Transaction.is_transfer,
            )
            .all()
        )

        # Aggregate by month with currency conversion
        monthly_data: dict = defaultdict(lambda: {"income": 0, "expense": 0})
        for row in results:
            amount_jpy = ForecastService._convert_to_jpy(
                abs(row.amount), row.currency, rates
            )
            if row.is_income:
                monthly_data[row.month_key]["income"] += amount_jpy
            else:
                monthly_data[row.month_key]["expense"] += amount_jpy

        # Get account balances at end of each month
        # For simplicity, we'll calculate running balance from current
        current_balance = ForecastService._get_total_balance(db, user_id, rates)

        # Build list sorted by month
        months = []
        sorted_keys = sorted(monthly_data.keys())

        # Calculate balance trajectory backwards from current
        balance = current_balance
        month_balances = {}

        # First pass: calculate what balance was at end of each historical month
        for month_key in reversed(sorted_keys):
            data = monthly_data[month_key]
            net = data["income"] - data["expense"]
            balance -= net  # Going backwards
            month_balances[month_key] = balance + net  # Balance at end of month

        # Second pass: build response
        for month_key in sorted_keys:
            data = monthly_data[month_key]
            net = data["income"] - data["expense"]
            months.append({
                "month": month_key,
                "income": data["income"],
                "expense": data["expense"],
                "net": net,
                "balance": month_balances.get(month_key, current_balance),
                "is_actual": True,
            })

        return months

    @staticmethod
    def _calculate_avg_variable_expense(
        db: Session,
        user_id: int,
        lookback_months: int,
        rates: dict
    ) -> int:
        """Calculate average variable (non-recurring) expense.

        Variable = Total Expense - Recurring Expense
        """
        today = date.today()

        # Calculate lookback period
        start_month = today.month - lookback_months
        start_year = today.year
        while start_month < 1:
            start_month += 12
            start_year -= 1

        start_date = date(start_year, start_month, 1)
        end_date = today.replace(day=1) - timedelta(days=1)

        # Get total expenses in period
        results = (
            db.query(
                Transaction.amount,
                Transaction.currency,
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= start_date,
                Transaction.date <= end_date,
                ~Transaction.is_transfer,
                ~Transaction.is_income,
            )
            .all()
        )

        total_expense = sum(
            ForecastService._convert_to_jpy(abs(r.amount), r.currency, rates)
            for r in results
        )

        # Get recurring expenses that ran in this period
        recurring_expense = ForecastService._get_historical_recurring_expense(
            db, user_id, start_date, end_date, rates
        )

        # Variable = Total - Recurring
        variable_expense = max(0, total_expense - recurring_expense)

        # Return monthly average
        if lookback_months > 0:
            return variable_expense // lookback_months
        return variable_expense

    @staticmethod
    def _get_historical_recurring_expense(
        db: Session,
        user_id: int,
        start_date: date,
        end_date: date,
        rates: dict
    ) -> int:
        """Estimate recurring expenses that occurred in a date range."""
        recurring_txns = db.query(RecurringTransaction).filter(
            RecurringTransaction.user_id == user_id,
            RecurringTransaction.is_active == True,
            ~RecurringTransaction.is_income,
        ).all()

        total = 0
        for r in recurring_txns:
            # Estimate how many times this recurring ran in the period
            occurrences = ForecastService._count_occurrences_in_range(
                r, start_date, end_date
            )
            amount_jpy = ForecastService._convert_to_jpy(
                r.amount, r.account.currency if r.account else "JPY", rates
            )
            total += amount_jpy * occurrences

        return total

    @staticmethod
    def _count_occurrences_in_range(
        recurring: RecurringTransaction,
        start_date: date,
        end_date: date
    ) -> int:
        """Count how many times a recurring transaction occurs in a date range."""
        if recurring.frequency == "monthly":
            # Roughly one per month
            months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1
            return max(0, months)
        elif recurring.frequency == "weekly":
            days = (end_date - start_date).days + 1
            return max(0, days // 7)
        elif recurring.frequency == "yearly":
            years = end_date.year - start_date.year + 1
            return max(0, years)
        elif recurring.frequency == "custom" and recurring.interval_days:
            days = (end_date - start_date).days + 1
            return max(0, days // recurring.interval_days)
        return 1

    @staticmethod
    def _get_recurring_for_month(
        recurring_txns: list[RecurringTransaction],
        year: int,
        month: int,
        rates: dict
    ) -> tuple[int, int]:
        """Get total recurring income and expense for a specific month.

        Returns:
            Tuple of (recurring_income, recurring_expense) in JPY
        """
        recurring_income = 0
        recurring_expense = 0

        for r in recurring_txns:
            # Check if this recurring will run in the target month
            if ForecastService._will_run_in_month(r, year, month):
                amount_jpy = ForecastService._convert_to_jpy(
                    r.amount,
                    r.account.currency if r.account else "JPY",
                    rates
                )
                if r.is_income:
                    recurring_income += amount_jpy
                else:
                    recurring_expense += amount_jpy

        return recurring_income, recurring_expense

    @staticmethod
    def _will_run_in_month(
        recurring: RecurringTransaction,
        year: int,
        month: int
    ) -> bool:
        """Check if a recurring transaction will run in the given month."""
        if recurring.frequency == "monthly":
            return True
        elif recurring.frequency == "weekly":
            # Weekly runs ~4 times per month
            return True
        elif recurring.frequency == "yearly":
            # Check if the recurring's typical month matches
            if recurring.next_run_date:
                return recurring.next_run_date.month == month
            return False
        elif recurring.frequency == "custom":
            # Custom frequency - assume it runs each month for simplicity
            return True
        return False
