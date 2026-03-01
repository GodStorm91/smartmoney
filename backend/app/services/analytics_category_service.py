"""Analytics service: category and source breakdown queries."""
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


class CategoryAnalyticsService:
    """Category and source-focused analytics."""

    @staticmethod
    def get_category_breakdown(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        """Get expense breakdown by category for a specific user.

        Returns:
            List of category breakdown dicts sorted by amount desc (JPY)
        """
        rates = ExchangeRateService.get_cached_rates(db)

        query = (
            db.query(Transaction.category, Transaction.amount, Transaction.currency)
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                ~Transaction.is_income,
            )
        )
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        results = query.all()

        category_totals: dict[str, dict] = {}
        for row in results:
            cat = row.category
            if cat not in category_totals:
                category_totals[cat] = {"amount": 0, "count": 0}
            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            category_totals[cat]["amount"] += amount_jpy
            category_totals[cat]["count"] += 1

        categories = [
            {"category": cat, "amount": data["amount"], "count": data["count"]}
            for cat, data in category_totals.items()
        ]
        categories.sort(key=lambda x: x["amount"], reverse=True)
        return categories

    @staticmethod
    def get_sources_breakdown(
        db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> list[dict]:
        """Get transaction breakdown by source for a specific user.

        Returns:
            List of source breakdown dicts sorted by count desc
        """
        query = (
            db.query(Transaction.source, Transaction.amount, Transaction.currency)
            .filter(Transaction.user_id == user_id, ~Transaction.is_transfer)
        )
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        rows = query.all()
        rates = ExchangeRateService.get_cached_rates(db)

        source_totals: dict[str, dict] = {}
        for row in rows:
            key = row.source
            if key not in source_totals:
                source_totals[key] = {"total": 0, "count": 0}
            source_totals[key]["total"] += convert_to_jpy(row.amount, row.currency, rates)
            source_totals[key]["count"] += 1

        return sorted(
            [{"source": k, "total": v["total"], "count": v["count"]} for k, v in source_totals.items()],
            key=lambda x: x["count"],
            reverse=True,
        )

    @staticmethod
    def get_category_spending(
        db: Session, user_id: int, start_date: date, end_date: date
    ) -> dict:
        """Get spending totals by category for a date range (converted to JPY).

        Returns:
            Dict mapping category name -> JPY total
        """
        rates = ExchangeRateService.get_cached_rates(db)

        results = (
            db.query(Transaction.category, Transaction.amount, Transaction.currency)
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= start_date,
                Transaction.date <= end_date,
                ~Transaction.is_transfer,
                ~Transaction.is_income,
            )
            .all()
        )

        category_totals: dict[str, int] = {}
        for row in results:
            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            category_totals[row.category] = category_totals.get(row.category, 0) + amount_jpy
        return category_totals
