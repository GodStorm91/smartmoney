"""Category service for category management."""
from sqlalchemy.orm import Session

from ..models.category import Category


class CategoryService:
    """Service for category operations."""

    @staticmethod
    def get_or_create_crypto_rewards_category(db: Session, user_id: int) -> Category:
        """Get or create Crypto Rewards income category.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Category instance
        """
        # Try to find existing category
        category = db.query(Category).filter(
            Category.user_id == user_id,
            Category.name == "Crypto Rewards",
            Category.type == "income",
            Category.parent_id.is_(None)  # Top-level category
        ).first()

        if category:
            return category

        # Create new category
        category = Category(
            user_id=user_id,
            name="Crypto Rewards",
            icon="🎁",
            type="income",
            parent_id=None,
            is_system=False,  # User-specific, not system-wide
            display_order=999  # Put at end
        )

        db.add(category)
        db.commit()
        db.refresh(category)

        return category
