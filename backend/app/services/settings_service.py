"""Settings service for app configuration."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.transaction import Transaction


class SettingsService:
    """Service for settings operations."""

    @staticmethod
    def get_settings(db: Session) -> dict:
        """Get app settings with unique categories and sources.

        Args:
            db: Database session

        Returns:
            Dictionary with currency, base_date, categories, and sources
        """
        # Get unique categories from transactions
        categories_query = (
            db.query(Transaction.category)
            .filter(Transaction.category.isnot(None))
            .distinct()
            .order_by(Transaction.category)
            .all()
        )
        categories = [cat[0] for cat in categories_query if cat[0]]

        # Get unique sources from transactions
        sources_query = (
            db.query(Transaction.source)
            .filter(Transaction.source.isnot(None))
            .distinct()
            .order_by(Transaction.source)
            .all()
        )
        sources = [src[0] for src in sources_query if src[0]]

        return {
            "currency": "JPY",
            "base_date": 25,
            "categories": categories,
            "sources": sources,
        }

    @staticmethod
    def get_categories(db: Session) -> list[str]:
        """Get unique categories from transactions.

        Args:
            db: Database session

        Returns:
            List of unique category names
        """
        categories_query = (
            db.query(Transaction.category)
            .filter(Transaction.category.isnot(None))
            .distinct()
            .order_by(Transaction.category)
            .all()
        )
        return [cat[0] for cat in categories_query if cat[0]]

    @staticmethod
    def get_sources(db: Session) -> list[str]:
        """Get unique sources from transactions.

        Args:
            db: Database session

        Returns:
            List of unique source names
        """
        sources_query = (
            db.query(Transaction.source)
            .filter(Transaction.source.isnot(None))
            .distinct()
            .order_by(Transaction.source)
            .all()
        )
        return [src[0] for src in sources_query if src[0]]
