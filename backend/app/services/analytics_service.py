"""Analytics service for cashflow analysis and category breakdown."""

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from ..models.budget import Budget
from .exchange_rate_service import ExchangeRateService


class AnalyticsService:
    """Service for analytics operations."""

    @staticmethod
    def get_monthly_cashflow(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[dict]:
        """Get monthly cashflow grouped by month for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of monthly cashflow dictionaries (amounts normalized to JPY)
        """
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Query transactions grouped by month and currency
        query = (
            db.query(
                Transaction.month_key,
                Transaction.currency,
                func.sum(case((Transaction.is_income, Transaction.amount), else_=0)).label(
                    "income"
                ),
                func.sum(case((~Transaction.is_income, Transaction.amount), else_=0)).label(
                    "expenses"
                ),
            )
            .filter(Transaction.user_id == user_id, ~Transaction.is_transfer)
            .group_by(Transaction.month_key, Transaction.currency)
            .order_by(Transaction.month_key)
        )

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        # Aggregate by month with currency conversion
        monthly_data: dict[str, dict] = defaultdict(lambda: {"income": 0, "expenses": 0})

        for row in results:
            month = row.month_key
            currency = row.currency or "JPY"
            income_raw = row.income or 0
            expenses_raw = abs(row.expenses or 0)

            # Convert to JPY
            income_jpy = AnalyticsService._convert_to_jpy(int(income_raw), currency, rates)
            expenses_jpy = AnalyticsService._convert_to_jpy(int(expenses_raw), currency, rates)

            monthly_data[month]["income"] += income_jpy
            monthly_data[month]["expenses"] += expenses_jpy

        # Build result list
        return [
            {
                "month": month,
                "income": data["income"],
                "expenses": data["expenses"],
                "net": data["income"] - data["expenses"],
            }
            for month, data in sorted(monthly_data.items())
        ]

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
    def get_category_breakdown(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[dict]:
        """Get expense breakdown by category for a specific user with comparison to previous period.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of category breakdown dictionaries (amounts normalized to JPY)
            with previous_amount and change_percent for comparison
        """
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Get current period totals
        current_totals = AnalyticsService._get_category_totals(
            db, user_id, start_date, end_date, rates
        )

        # Calculate previous period dates for comparison
        previous_totals: dict[str, int] = {}
        if start_date and end_date:
            period_length = (end_date - start_date).days + 1
            prev_end = start_date - timedelta(days=1)
            prev_start = prev_end - timedelta(days=period_length - 1)
            previous_totals = AnalyticsService._get_category_totals(
                db, user_id, prev_start, prev_end, rates
            )

        # Build result list sorted by amount descending
        categories = []
        for category, data in sorted(current_totals.items(), key=lambda x: -x[1]["amount"]):
            prev_amount = previous_totals.get(category, {}).get("amount")
            change_pct = None
            if prev_amount is not None and prev_amount > 0:
                change_pct = round(((data["amount"] - prev_amount) / prev_amount) * 100, 1)

            categories.append(
                {
                    "category": category,
                    "amount": data["amount"],
                    "count": data["count"],
                    "previous_amount": prev_amount,
                    "change_percent": change_pct,
                }
            )

        return categories

    @staticmethod
    def _get_category_totals(
        db: Session, user_id: int, start_date: Optional[date], end_date: Optional[date], rates: dict
    ) -> dict[str, dict]:
        """Get category totals with amount and count for a date range."""
        query = db.query(
            Transaction.category,
            Transaction.amount,
            Transaction.currency,
        ).filter(Transaction.user_id == user_id, ~Transaction.is_transfer, ~Transaction.is_income)

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        # Aggregate by category with currency conversion
        category_data: dict[str, dict] = defaultdict(lambda: {"amount": 0, "count": 0})

        for row in results:
            amount_jpy = AnalyticsService._convert_to_jpy(abs(row.amount), row.currency, rates)
            category_data[row.category]["amount"] += amount_jpy
            category_data[row.category]["count"] += 1

        return dict(category_data)

    @staticmethod
    def get_monthly_trend(db: Session, user_id: int, months: int = 12) -> list[dict]:
        """Get monthly trend for last N months for a specific user.

        Args:
            db: Database session
            user_id: User ID
            months: Number of months to include

        Returns:
            List of monthly trend data (amounts normalized to JPY)
        """
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Query transactions grouped by month, currency, and income/expense
        query = (
            db.query(
                Transaction.month_key,
                Transaction.currency,
                func.sum(case((Transaction.is_income, Transaction.amount), else_=0)).label(
                    "income"
                ),
                func.sum(case((~Transaction.is_income, Transaction.amount), else_=0)).label(
                    "expenses"
                ),
            )
            .filter(Transaction.user_id == user_id, ~Transaction.is_transfer)
            .group_by(Transaction.month_key, Transaction.currency)
            .order_by(Transaction.month_key.desc())
            .limit(months * 3)  # Get more rows since we group by currency too
        )

        results = query.all()

        # Aggregate by month with currency conversion
        monthly_totals: dict[str, dict] = defaultdict(lambda: {"income": 0, "expenses": 0})

        for row in results:
            month = row.month_key
            currency = row.currency or "JPY"
            income_raw = row.income or 0
            expenses_raw = abs(row.expenses or 0)

            # Convert to JPY
            income_jpy = AnalyticsService._convert_to_jpy(int(income_raw), currency, rates)
            expenses_jpy = AnalyticsService._convert_to_jpy(int(expenses_raw), currency, rates)

            monthly_totals[month]["income"] += income_jpy
            monthly_totals[month]["expenses"] += expenses_jpy

        # Build trend data in chronological order
        trend_data = []
        for month_data in sorted(monthly_totals.items(), key=lambda x: x[0]):
            month, data = month_data
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
    def get_sources_breakdown(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[dict]:
        """Get transaction breakdown by source for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of source breakdown dictionaries
        """
        query = (
            db.query(
                Transaction.source,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .filter(Transaction.user_id == user_id, ~Transaction.is_transfer)
            .group_by(Transaction.source)
            .order_by(func.count(Transaction.id).desc())
        )

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        sources = []
        for row in results:
            sources.append(
                {
                    "source": row.source,
                    "total": row.total,
                    "count": row.count,
                }
            )

        return sources

    @staticmethod
    def _calculate_period_totals(
        db: Session, user_id: int, start_date: date, end_date: date
    ) -> dict:
        """Calculate income/expense/net totals for a specific period.

        Args:
            db: Database session
            user_id: User ID
            start_date: Period start date
            end_date: Period end date

        Returns:
            Dictionary with income, expense, net totals
        """
        results = (
            db.query(
                func.sum(case((Transaction.is_income, Transaction.amount), else_=0)).label(
                    "income"
                ),
                func.sum(case((~Transaction.is_income, Transaction.amount), else_=0)).label(
                    "expenses"
                ),
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= start_date,
                Transaction.date <= end_date,
                ~Transaction.is_transfer,
            )
            .first()
        )

        income = results.income or 0
        expenses = abs(results.expenses or 0)
        return {
            "income": income,
            "expense": expenses,
            "net": income - expenses,
        }

    @staticmethod
    def _calculate_percentage_change(current: int, previous: int) -> Optional[float]:
        """Calculate percentage change between two values.

        Returns None if previous is 0 (avoid division by zero).
        """
        if previous == 0:
            return None
        return round(((current - previous) / previous) * 100, 1)

    @staticmethod
    def get_comprehensive_analytics(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """Get comprehensive analytics with all data for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            Dictionary with monthly trends, category breakdown, totals,
            comparison data (vs previous period), and top category
        """
        # For monthly trends, ensure at least 3 months of data for meaningful charts
        # Extend start_date backwards if needed
        trends_start = start_date
        if start_date and end_date:
            # Calculate months between dates
            months_diff = (end_date.year - start_date.year) * 12 + end_date.month - start_date.month
            if months_diff < 2:  # Less than 3 months
                # Extend back to get 3 months total
                months_to_add = 2 - months_diff
                trends_start = date(
                    start_date.year if start_date.month > months_to_add else start_date.year - 1,
                    (start_date.month - months_to_add - 1) % 12 + 1,
                    1,
                )

        # Get monthly trends (with extended date range for meaningful charts)
        monthly_trends = AnalyticsService.get_monthly_cashflow(
            db=db, user_id=user_id, start_date=trends_start, end_date=end_date
        )

        # Get category breakdown
        category_breakdown = AnalyticsService.get_category_breakdown(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

        # Calculate totals from monthly trends
        total_income = sum(month["income"] for month in monthly_trends)
        total_expense = sum(month["expenses"] for month in monthly_trends)
        net_cashflow = total_income - total_expense

        # Calculate comparison data (vs previous period)
        comparison = None
        if start_date and end_date:
            # Calculate previous period dates
            period_length = (end_date - start_date).days + 1
            prev_end = start_date - timedelta(days=1)
            prev_start = prev_end - timedelta(days=period_length - 1)

            # Get previous period totals
            prev_totals = AnalyticsService._calculate_period_totals(
                db=db, user_id=user_id, start_date=prev_start, end_date=prev_end
            )

            # Calculate percentage changes
            comparison = {
                "income_change": AnalyticsService._calculate_percentage_change(
                    total_income, prev_totals["income"]
                ),
                "expense_change": AnalyticsService._calculate_percentage_change(
                    total_expense, prev_totals["expense"]
                ),
                "net_change": AnalyticsService._calculate_percentage_change(
                    net_cashflow, prev_totals["net"]
                )
                if prev_totals["net"] != 0
                else None,
            }

        # Extract top category
        top_category = None
        if category_breakdown and total_expense > 0:
            top_cat = category_breakdown[0]  # Already sorted DESC by amount
            top_category = {
                "name": top_cat["category"],
                "amount": top_cat["amount"],
                "percentage": round((top_cat["amount"] / total_expense) * 100, 1),
            }

        return {
            "monthly_trends": monthly_trends,
            "category_breakdown": category_breakdown,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_cashflow": net_cashflow,
            "comparison": comparison,
            "top_category": top_category,
        }

    @staticmethod
    def generate_spending_insights(db: Session, user_id: int) -> list[dict]:
        """Generate smart spending insights for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of insight dictionaries
        """
        insights = []
        today = date.today()
        current_month_start = today.replace(day=1)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        last_month_end = current_month_start - timedelta(days=1)

        # Get current month spending by category
        current_spending = AnalyticsService._get_category_spending(
            db, user_id, current_month_start, today
        )

        # Get last month spending by category
        last_spending = AnalyticsService._get_category_spending(
            db, user_id, last_month_start, last_month_end
        )

        # 1. Spending spike detection (>30% increase)
        for category, amount in current_spending.items():
            last_amount = last_spending.get(category, 0)
            if last_amount > 0:
                change = ((amount - last_amount) / last_amount) * 100
                if change > 30:
                    insights.append(
                        {
                            "type": "spike",
                            "severity": "warning",
                            "title": f"{category} spending increased",
                            "message": f"Up {change:.0f}% compared to last month",
                            "category": category,
                            "amount": amount,
                            "percentage_change": round(change, 1),
                        }
                    )
                elif change < -20:
                    insights.append(
                        {
                            "type": "saving",
                            "severity": "success",
                            "title": f"{category} spending decreased",
                            "message": f"Down {abs(change):.0f}% compared to last month",
                            "category": category,
                            "amount": amount,
                            "percentage_change": round(change, 1),
                        }
                    )

        # 2. Budget alerts
        budgets = (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id, Budget.month == current_month_start.strftime("%Y-%m")
            )
            .all()
        )

        for budget in budgets:
            # Iterate over budget allocations (category-level budgets)
            for allocation in budget.allocations:
                spent = current_spending.get(allocation.category, 0)
                if allocation.amount > 0:
                    usage = (spent / allocation.amount) * 100
                    if usage >= 100:
                        insights.append(
                            {
                                "type": "budget",
                                "severity": "warning",
                                "title": f"{allocation.category} budget exceeded",
                                "message": f"Spent {usage:.0f}% of budget",
                                "category": allocation.category,
                                "amount": spent,
                                "percentage_change": round(usage - 100, 1),
                            }
                        )
                    elif usage >= 80:
                        insights.append(
                            {
                                "type": "budget",
                                "severity": "info",
                                "title": f"{allocation.category} budget at {usage:.0f}%",
                                "message": "Approaching budget limit",
                                "category": allocation.category,
                                "amount": spent,
                                "percentage_change": round(usage, 1),
                            }
                        )

        # 3. Overall spending trend
        current_total = sum(current_spending.values())
        last_total = sum(last_spending.values())
        if last_total > 0:
            total_change = ((current_total - last_total) / last_total) * 100
            if total_change > 20:
                insights.append(
                    {
                        "type": "trend",
                        "severity": "warning",
                        "title": "Overall spending up",
                        "message": f"Total spending increased {total_change:.0f}% this month",
                        "amount": current_total,
                        "percentage_change": round(total_change, 1),
                    }
                )
            elif total_change < -10:
                insights.append(
                    {
                        "type": "trend",
                        "severity": "success",
                        "title": "Great job saving!",
                        "message": f"Total spending down {abs(total_change):.0f}% this month",
                        "amount": current_total,
                        "percentage_change": round(total_change, 1),
                    }
                )

        # 4. Top spending category
        if current_spending:
            top_category = max(current_spending, key=current_spending.get)
            top_amount = current_spending[top_category]
            if current_total > 0:
                percentage = (top_amount / current_total) * 100
                if percentage > 40:
                    insights.append(
                        {
                            "type": "unusual",
                            "severity": "info",
                            "title": f"{top_category} is top expense",
                            "message": f"Accounts for {percentage:.0f}% of spending",
                            "category": top_category,
                            "amount": top_amount,
                            "percentage_change": round(percentage, 1),
                        }
                    )

        return insights

    @staticmethod
    def _get_category_spending(db: Session, user_id: int, start_date: date, end_date: date) -> dict:
        """Get spending totals by category for a date range (normalized to JPY)."""
        rates = ExchangeRateService.get_cached_rates(db)

        results = (
            db.query(
                Transaction.category,
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

        category_totals: dict[str, int] = defaultdict(int)
        for row in results:
            amount_jpy = AnalyticsService._convert_to_jpy(abs(row.amount), row.currency, rates)
            category_totals[row.category] += amount_jpy

        return dict(category_totals)
