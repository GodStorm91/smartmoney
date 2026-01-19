"""Settings service for app configuration."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.settings import AppSettings
from ..models.transaction import Transaction


class SettingsService:
    """Service for settings operations."""

    @staticmethod
    def get_settings(db: Session, user_id: int) -> dict:
        """Get app settings with unique categories and sources for a specific user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dictionary with currency, base_date, categories, and sources
        """
        # Get app settings from database for user
        settings = db.query(AppSettings).filter(AppSettings.user_id == user_id).first()

        # If no settings found, create default settings for user
        if not settings:
            settings = AppSettings(
                user_id=user_id,
                currency="JPY",
                base_date=25
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)

        currency = settings.currency
        base_date = settings.base_date

        # Get unique categories from transactions for this user
        categories_query = (
            db.query(Transaction.category)
            .filter(
                Transaction.user_id == user_id,
                Transaction.category.isnot(None)
            )
            .distinct()
            .order_by(Transaction.category)
            .all()
        )
        categories = [cat[0] for cat in categories_query if cat[0]]

        # Get unique sources from transactions for this user
        sources_query = (
            db.query(Transaction.source)
            .filter(
                Transaction.user_id == user_id,
                Transaction.source.isnot(None)
            )
            .distinct()
            .order_by(Transaction.source)
            .all()
        )
        sources = [src[0] for src in sources_query if src[0]]

        return {
            "currency": currency,
            "base_date": base_date,
            "budget_carry_over": settings.budget_carry_over,
            "budget_email_alerts": settings.budget_email_alerts,
            "categories": categories,
            "sources": sources,
        }

    @staticmethod
    def update_settings(db: Session, user_id: int, updates: dict) -> dict:
        """Update app settings for a specific user.

        Args:
            db: Database session
            user_id: User ID
            updates: Dictionary of fields to update (currency, base_date)

        Returns:
            Updated settings dictionary

        Raises:
            ValueError: If settings row not found
        """
        # Get existing settings for user
        settings = db.query(AppSettings).filter(AppSettings.user_id == user_id).first()

        if not settings:
            # Create settings if not found
            settings = AppSettings(
                user_id=user_id,
                currency="JPY",
                base_date=25
            )
            db.add(settings)

        # Update only provided fields
        if "currency" in updates and updates["currency"] is not None:
            settings.currency = updates["currency"]
        if "base_date" in updates and updates["base_date"] is not None:
            settings.base_date = updates["base_date"]
        if "budget_carry_over" in updates and updates["budget_carry_over"] is not None:
            settings.budget_carry_over = updates["budget_carry_over"]
        if "budget_email_alerts" in updates and updates["budget_email_alerts"] is not None:
            settings.budget_email_alerts = updates["budget_email_alerts"]

        db.commit()
        db.refresh(settings)

        # Return full settings (including categories and sources)
        return SettingsService.get_settings(db, user_id)

    @staticmethod
    def get_categories(db: Session, user_id: int) -> list[str]:
        """Get unique categories from transactions for a specific user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of unique category names
        """
        categories_query = (
            db.query(Transaction.category)
            .filter(
                Transaction.user_id == user_id,
                Transaction.category.isnot(None)
            )
            .distinct()
            .order_by(Transaction.category)
            .all()
        )
        return [cat[0] for cat in categories_query if cat[0]]

    @staticmethod
    def get_sources(db: Session, user_id: int) -> list[str]:
        """Get unique sources from transactions for a specific user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of unique source names
        """
        sources_query = (
            db.query(Transaction.source)
            .filter(
                Transaction.user_id == user_id,
                Transaction.source.isnot(None)
            )
            .distinct()
            .order_by(Transaction.source)
            .all()
        )
        return [src[0] for src in sources_query if src[0]]
