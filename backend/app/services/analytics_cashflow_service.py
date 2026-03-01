"""Analytics service: monthly cashflow queries and aggregations."""
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


class CashflowAnalyticsService:
    """Cashflow-focused analytics: monthly trends and comprehensive summaries."""

    @staticmethod
    def get_monthly_cashflow(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        """Get monthly cashflow grouped by month for a specific user.

        Returns:
            List of monthly cashflow dicts (amounts converted to JPY)
        """
        rates = ExchangeRateService.get_cached_rates(db)

        query = (
            db.query(
                Transaction.month_key,
                Transaction.amount,
                Transaction.currency,
                Transaction.is_income,
            )
            .filter(Transaction.user_id == user_id, ~Transaction.is_transfer)
            .order_by(Transaction.month_key)
        )
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        monthly_totals: dict[str, dict] = {}
        for row in results:
            month = row.month_key
            if month not in monthly_totals:
                monthly_totals[month] = {"income": 0, "expenses": 0}
            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            if row.is_income:
                monthly_totals[month]["income"] += amount_jpy
            else:
                monthly_totals[month]["expenses"] += amount_jpy

        monthly_data = []
        for month in sorted(monthly_totals.keys()):
            data = monthly_totals[month]
            monthly_data.append(
                {
                    "month": month,
                    "income": data["income"],
                    "expenses": data["expenses"],
                    "net": data["income"] - data["expenses"],
                }
            )
        return monthly_data

    @staticmethod
    def get_monthly_trend(db: Session, user_id: int, months: int = 12) -> list[dict]:
        """Get monthly trend for last N months for a specific user.

        Returns:
            List of monthly trend data (amounts converted to JPY), chronological
        """
        rates = ExchangeRateService.get_cached_rates(db)

        month_query = (
            db.query(Transaction.month_key)
            .filter(Transaction.user_id == user_id, ~Transaction.is_transfer)
            .distinct()
            .order_by(Transaction.month_key.desc())
            .limit(months)
        )
        target_months = [m[0] for m in month_query.all()]
        if not target_months:
            return []

        query = (
            db.query(
                Transaction.month_key,
                Transaction.amount,
                Transaction.currency,
                Transaction.is_income,
            )
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                Transaction.month_key.in_(target_months),
            )
        )
        results = query.all()

        monthly_totals: dict[str, dict] = {}
        for row in results:
            month = row.month_key
            if month not in monthly_totals:
                monthly_totals[month] = {"income": 0, "expenses": 0}
            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            if row.is_income:
                monthly_totals[month]["income"] += amount_jpy
            else:
                monthly_totals[month]["expenses"] += amount_jpy

        trend_data = []
        for month in sorted(monthly_totals.keys()):
            data = monthly_totals[month]
            trend_data.append(
                {
                    "month": month,
                    "income": data["income"],
                    "expenses": data["expenses"],
                    "net": data["income"] - data["expenses"],
                }
            )
        return trend_data

    @staticmethod
    def get_comprehensive_analytics(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> dict:
        """Get comprehensive analytics: monthly trends, category breakdown, totals.

        Returns:
            Dict with monthly_trends, category_breakdown, totals
        """
        from .analytics_category_service import CategoryAnalyticsService

        monthly_trends = CashflowAnalyticsService.get_monthly_cashflow(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )
        category_breakdown = CategoryAnalyticsService.get_category_breakdown(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

        total_income = sum(month["income"] for month in monthly_trends)
        total_expense = sum(month["expenses"] for month in monthly_trends)

        return {
            "monthly_trends": monthly_trends,
            "category_breakdown": category_breakdown,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_cashflow": total_income - total_expense,
        }

    @staticmethod
    def get_year_over_year(db: Session, user_id: int) -> dict:
        """Get year-over-year monthly comparison for a specific user.

        Returns monthly income/expense for the current year vs previous year,
        with percentage changes. Future months in the current year return None
        so the frontend can omit their bars.
        """
        today = date.today()
        current_year = today.year
        previous_year = current_year - 1
        current_month = today.month

        rates = ExchangeRateService.get_cached_rates(db)

        results = (
            db.query(
                Transaction.month_key,
                Transaction.amount,
                Transaction.currency,
                Transaction.is_income,
            )
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                Transaction.month_key.in_(
                    [f"{current_year}-{m:02d}" for m in range(1, 13)]
                    + [f"{previous_year}-{m:02d}" for m in range(1, 13)]
                ),
            )
            .all()
        )

        monthly_totals: dict[str, dict] = {}
        for row in results:
            month = row.month_key
            if month not in monthly_totals:
                monthly_totals[month] = {"income": 0, "expenses": 0}
            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            if row.is_income:
                monthly_totals[month]["income"] += amount_jpy
            else:
                monthly_totals[month]["expenses"] += amount_jpy

        month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        months_data = []
        for m in range(1, 13):
            curr_key = f"{current_year}-{m:02d}"
            prev_key = f"{previous_year}-{m:02d}"

            curr_data = monthly_totals.get(curr_key, {"income": 0, "expenses": 0})
            prev_data = monthly_totals.get(prev_key, {"income": 0, "expenses": 0})

            # Future months: return None so frontend omits current-year bars
            if m > current_month:
                curr_expense: float | None = None
                curr_income: float | None = None
            else:
                curr_expense = curr_data["expenses"]
                curr_income = curr_data["income"]

            prev_expense = prev_data["expenses"]
            prev_income = prev_data["income"]

            expense_change_pct: float | None = None
            if curr_expense is not None and prev_expense > 0:
                expense_change_pct = round(
                    ((curr_expense - prev_expense) / prev_expense) * 100, 1
                )

            income_change_pct: float | None = None
            if curr_income is not None and prev_income > 0:
                income_change_pct = round(
                    ((curr_income - prev_income) / prev_income) * 100, 1
                )

            months_data.append({
                "month": m,
                "label": month_labels[m - 1],
                "current_expense": curr_expense,
                "previous_expense": prev_expense,
                "current_income": curr_income,
                "previous_income": prev_income,
                "expense_change_pct": expense_change_pct,
                "income_change_pct": income_change_pct,
            })

        # Totals only over elapsed months for a fair YoY comparison
        total_current_expense = sum(
            m["current_expense"] for m in months_data if m["current_expense"] is not None
        )
        total_previous_expense = sum(
            m["previous_expense"] for m in months_data if m["month"] <= current_month
        )
        total_current_income = sum(
            m["current_income"] for m in months_data if m["current_income"] is not None
        )
        total_previous_income = sum(
            m["previous_income"] for m in months_data if m["month"] <= current_month
        )

        total_expense_change_pct: float | None = None
        if total_previous_expense > 0:
            total_expense_change_pct = round(
                ((total_current_expense - total_previous_expense) / total_previous_expense) * 100,
                1,
            )

        total_income_change_pct: float | None = None
        if total_previous_income > 0:
            total_income_change_pct = round(
                ((total_current_income - total_previous_income) / total_previous_income) * 100,
                1,
            )

        return {
            "current_year": current_year,
            "previous_year": previous_year,
            "months": months_data,
            "summary": {
                "total_current_expense": total_current_expense,
                "total_previous_expense": total_previous_expense,
                "total_current_income": total_current_income,
                "total_previous_income": total_previous_income,
                "total_expense_change_pct": total_expense_change_pct,
                "total_income_change_pct": total_income_change_pct,
            },
        }

    @staticmethod
    def get_spending_velocity(db: Session, user_id: int) -> dict:
        """Get current month spending velocity (daily burn rate).

        Returns:
            Dict with total_spent, days_elapsed, days_in_month, daily_average,
            projected_month_total, days_remaining, last_month_total,
            velocity_change_pct
        """
        import calendar
        from datetime import timedelta

        rates = ExchangeRateService.get_cached_rates(db)
        today = date.today()
        current_month_start = today.replace(day=1)
        days_in_month = calendar.monthrange(today.year, today.month)[1]
        days_elapsed = max(today.day, 1)
        days_remaining = days_in_month - today.day

        last_month_end = current_month_start - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        days_in_last_month = calendar.monthrange(last_month_start.year, last_month_start.month)[1]

        def _sum_expenses(start: date, end: date) -> float:
            rows = (
                db.query(Transaction.amount, Transaction.currency)
                .filter(
                    Transaction.user_id == user_id,
                    Transaction.date >= start,
                    Transaction.date <= end,
                    ~Transaction.is_transfer,
                    ~Transaction.is_income,
                )
                .all()
            )
            return sum(convert_to_jpy(abs(r.amount), r.currency, rates) for r in rows)

        total_spent = _sum_expenses(current_month_start, today)
        last_month_total = _sum_expenses(last_month_start, last_month_end)

        daily_average = total_spent / days_elapsed
        projected_month_total = daily_average * days_in_month

        last_daily_average = last_month_total / days_in_last_month if days_in_last_month > 0 else 0
        velocity_change_pct = (
            ((daily_average / last_daily_average) - 1) * 100
            if last_daily_average > 0
            else 0.0
        )

        return {
            "total_spent": round(total_spent, 2),
            "days_elapsed": days_elapsed,
            "days_in_month": days_in_month,
            "daily_average": round(daily_average, 2),
            "projected_month_total": round(projected_month_total, 2),
            "days_remaining": days_remaining,
            "last_month_total": round(last_month_total, 2),
            "velocity_change_pct": round(velocity_change_pct, 1),
        }
