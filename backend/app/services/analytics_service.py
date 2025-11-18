"""Analytics service for cashflow analysis and category breakdown."""
from datetime import date
from typing import Optional

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..models.transaction import Transaction


class AnalyticsService:
    """Service for analytics operations."""

    @staticmethod
    def get_monthly_cashflow(
        db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        """Get monthly cashflow grouped by month.

        Args:
            db: Database session
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of monthly cashflow dictionaries
        """
        query = (
            db.query(
                Transaction.month_key,
                func.sum(
                    case(
                        (Transaction.is_income, Transaction.amount), else_=0
                    )
                ).label("income"),
                func.sum(
                    case(
                        (~Transaction.is_income, Transaction.amount), else_=0
                    )
                ).label("expenses"),
            )
            .filter(~Transaction.is_transfer)
            .group_by(Transaction.month_key)
            .order_by(Transaction.month_key)
        )

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        monthly_data = []
        for row in results:
            income = row.income or 0
            expenses = abs(row.expenses or 0)
            monthly_data.append(
                {
                    "month": row.month_key,
                    "income": income,
                    "expenses": expenses,
                    "net": income - expenses,
                }
            )

        return monthly_data

    @staticmethod
    def get_category_breakdown(
        db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        """Get expense breakdown by category.

        Args:
            db: Database session
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            List of category breakdown dictionaries
        """
        query = (
            db.query(
                Transaction.category,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .filter(~Transaction.is_transfer, ~Transaction.is_income)
            .group_by(Transaction.category)
            .order_by(func.sum(Transaction.amount).asc())  # Most negative first
        )

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        categories = []
        for row in results:
            categories.append(
                {
                    "category": row.category,
                    "amount": abs(row.total),  # Convert to positive
                    "count": row.count,
                }
            )

        return categories

    @staticmethod
    def get_monthly_trend(
        db: Session, months: int = 12
    ) -> list[dict]:
        """Get monthly trend for last N months.

        Args:
            db: Database session
            months: Number of months to include

        Returns:
            List of monthly trend data
        """
        query = (
            db.query(
                Transaction.month_key,
                func.sum(
                    case(
                        (Transaction.is_income, Transaction.amount), else_=0
                    )
                ).label("income"),
                func.sum(
                    case(
                        (~Transaction.is_income, Transaction.amount), else_=0
                    )
                ).label("expenses"),
            )
            .filter(~Transaction.is_transfer)
            .group_by(Transaction.month_key)
            .order_by(Transaction.month_key.desc())
            .limit(months)
        )

        results = query.all()

        trend_data = []
        for row in results:
            income = row.income or 0
            expenses = abs(row.expenses or 0)
            trend_data.append(
                {
                    "month": row.month_key,
                    "income": income,
                    "expenses": expenses,
                    "net": income - expenses,
                }
            )

        return list(reversed(trend_data))  # Return chronological order

    @staticmethod
    def get_sources_breakdown(
        db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        """Get transaction breakdown by source.

        Args:
            db: Database session
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
            .filter(~Transaction.is_transfer)
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
        db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> dict:
        """Get comprehensive analytics with all data.

        Args:
            db: Database session
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            Dictionary with monthly trends, category breakdown, and totals
        """
        # Get monthly trends
        monthly_trends = AnalyticsService.get_monthly_cashflow(
            db=db, start_date=start_date, end_date=end_date
        )

        # Get category breakdown
        category_breakdown = AnalyticsService.get_category_breakdown(
            db=db, start_date=start_date, end_date=end_date
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
