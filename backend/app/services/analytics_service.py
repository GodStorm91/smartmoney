"""Analytics service for cashflow analysis and category breakdown."""
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from ..models.budget import Budget
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


class AnalyticsService:
    """Service for analytics operations."""

    @staticmethod
    def get_monthly_cashflow(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        """Get monthly cashflow grouped by month for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of monthly cashflow dictionaries (amounts converted to JPY)
        """
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Query individual transactions to convert currencies
        query = (
            db.query(
                Transaction.month_key,
                Transaction.amount,
                Transaction.currency,
                Transaction.is_income
            )
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer
            )
            .order_by(Transaction.month_key)
        )

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        # Aggregate by month with currency conversion
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

        # Build sorted result list
        monthly_data = []
        for month in sorted(monthly_totals.keys()):
            data = monthly_totals[month]
            monthly_data.append({
                "month": month,
                "income": data["income"],
                "expenses": data["expenses"],
                "net": data["income"] - data["expenses"],
            })

        return monthly_data

    @staticmethod
    def get_category_breakdown(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        """Get expense breakdown by category for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of category breakdown dictionaries (amounts converted to JPY)
        """
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        query = (
            db.query(
                Transaction.category,
                Transaction.amount,
                Transaction.currency
            )
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                ~Transaction.is_income
            )
        )

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        # Aggregate by category with currency conversion
        category_totals: dict[str, dict] = {}
        for row in results:
            cat = row.category
            if cat not in category_totals:
                category_totals[cat] = {"amount": 0, "count": 0}

            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            category_totals[cat]["amount"] += amount_jpy
            category_totals[cat]["count"] += 1

        # Build sorted result list (highest amount first)
        categories = [
            {"category": cat, "amount": data["amount"], "count": data["count"]}
            for cat, data in category_totals.items()
        ]
        categories.sort(key=lambda x: x["amount"], reverse=True)

        return categories

    @staticmethod
    def get_monthly_trend(
        db: Session, user_id: int, months: int = 12
    ) -> list[dict]:
        """Get monthly trend for last N months for a specific user.

        Args:
            db: Database session
            user_id: User ID
            months: Number of months to include

        Returns:
            List of monthly trend data (amounts converted to JPY)
        """
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Get distinct months first, then query transactions
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

        # Query transactions for those months
        query = (
            db.query(
                Transaction.month_key,
                Transaction.amount,
                Transaction.currency,
                Transaction.is_income
            )
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                Transaction.month_key.in_(target_months)
            )
        )

        results = query.all()

        # Aggregate by month with currency conversion
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

        # Build sorted result list (chronological order)
        trend_data = []
        for month in sorted(monthly_totals.keys()):
            data = monthly_totals[month]
            trend_data.append({
                "month": month,
                "income": data["income"],
                "expenses": data["expenses"],
                "net": data["income"] - data["expenses"],
            })

        return trend_data

    @staticmethod
    def get_sources_breakdown(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
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
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer
            )
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
    def get_comprehensive_analytics(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> dict:
        """Get comprehensive analytics with all data for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            Dictionary with monthly trends, category breakdown, and totals
        """
        # Get monthly trends
        monthly_trends = AnalyticsService.get_monthly_cashflow(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

        # Get category breakdown
        category_breakdown = AnalyticsService.get_category_breakdown(
            db=db, user_id=user_id, start_date=start_date, end_date=end_date
        )

        # Calculate totals from monthly trends
        total_income = sum(month["income"] for month in monthly_trends)
        total_expense = sum(month["expenses"] for month in monthly_trends)
        net_cashflow = total_income - total_expense

        return {
            "monthly_trends": monthly_trends,
            "category_breakdown": category_breakdown,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_cashflow": net_cashflow,
        }

    @staticmethod
    def generate_spending_insights(
        db: Session, user_id: int
    ) -> list[dict]:
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
                    insights.append({
                        "type": "spike",
                        "severity": "warning",
                        "title": f"{category} spending increased",
                        "message": f"Up {change:.0f}% compared to last month",
                        "category": category,
                        "amount": amount,
                        "percentage_change": round(change, 1),
                    })
                elif change < -20:
                    insights.append({
                        "type": "saving",
                        "severity": "success",
                        "title": f"{category} spending decreased",
                        "message": f"Down {abs(change):.0f}% compared to last month",
                        "category": category,
                        "amount": amount,
                        "percentage_change": round(change, 1),
                    })

        # 2. Budget alerts
        budgets = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == current_month_start.strftime("%Y-%m")
        ).all()

        for budget in budgets:
            for alloc in budget.allocations:
                spent = current_spending.get(alloc.category, 0)
                if alloc.amount > 0:
                    usage = (spent / alloc.amount) * 100
                    if usage >= 100:
                        insights.append({
                            "type": "budget",
                            "severity": "warning",
                            "title": f"{alloc.category} budget exceeded",
                            "message": f"Spent {usage:.0f}% of budget",
                            "category": alloc.category,
                            "amount": spent,
                            "percentage_change": round(usage - 100, 1),
                        })
                    elif usage >= 80:
                        insights.append({
                            "type": "budget",
                            "severity": "info",
                            "title": f"{alloc.category} budget at {usage:.0f}%",
                            "message": "Approaching budget limit",
                            "category": alloc.category,
                            "amount": spent,
                            "percentage_change": round(usage, 1),
                        })

        # 3. Overall spending trend
        current_total = sum(current_spending.values())
        last_total = sum(last_spending.values())
        if last_total > 0:
            total_change = ((current_total - last_total) / last_total) * 100
            if total_change > 20:
                insights.append({
                    "type": "trend",
                    "severity": "warning",
                    "title": "Overall spending up",
                    "message": f"Total spending increased {total_change:.0f}% this month",
                    "amount": current_total,
                    "percentage_change": round(total_change, 1),
                })
            elif total_change < -10:
                insights.append({
                    "type": "trend",
                    "severity": "success",
                    "title": "Great job saving!",
                    "message": f"Total spending down {abs(total_change):.0f}% this month",
                    "amount": current_total,
                    "percentage_change": round(total_change, 1),
                })

        # 4. Top spending category
        if current_spending:
            top_category = max(current_spending, key=current_spending.get)
            top_amount = current_spending[top_category]
            if current_total > 0:
                percentage = (top_amount / current_total) * 100
                if percentage > 40:
                    insights.append({
                        "type": "unusual",
                        "severity": "info",
                        "title": f"{top_category} is top expense",
                        "message": f"Accounts for {percentage:.0f}% of spending",
                        "category": top_category,
                        "amount": top_amount,
                        "percentage_change": round(percentage, 1),
                    })

        return insights

    @staticmethod
    def _get_category_spending(
        db: Session, user_id: int, start_date: date, end_date: date
    ) -> dict:
        """Get spending totals by category for a date range (converted to JPY)."""
        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        results = (
            db.query(
                Transaction.category,
                Transaction.amount,
                Transaction.currency
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

        # Aggregate with currency conversion
        category_totals: dict[str, int] = {}
        for row in results:
            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            category_totals[row.category] = category_totals.get(row.category, 0) + amount_jpy

        return category_totals
