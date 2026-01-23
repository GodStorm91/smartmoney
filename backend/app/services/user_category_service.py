"""User category service."""
from sqlalchemy.orm import Session

from ..models.user_category import UserCategory
from ..models.transaction import Transaction


class UserCategoryService:
    """Service for managing user categories."""

    @staticmethod
    def get_all(db: Session, user_id: int) -> list[UserCategory]:
        """Get all custom categories for a user."""
        return db.query(UserCategory).filter(
            UserCategory.user_id == user_id
        ).order_by(UserCategory.created_at.desc()).all()

    @staticmethod
    def get_by_id(db: Session, user_id: int, category_id: int) -> UserCategory | None:
        """Get a category by ID."""
        return db.query(UserCategory).filter(
            UserCategory.id == category_id,
            UserCategory.user_id == user_id
        ).first()

    @staticmethod
    def create(db: Session, user_id: int, data: dict) -> UserCategory:
        """Create a new custom category."""
        category = UserCategory(user_id=user_id, **data)
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def update(
        db: Session,
        user_id: int,
        category_id: int,
        data: dict,
        cascade_to_transactions: bool = True
    ) -> tuple[UserCategory | None, int]:
        """
        Update a custom category and optionally cascade name changes to transactions.
        Returns (updated_category, affected_transaction_count)
        """
        category = db.query(UserCategory).filter(
            UserCategory.id == category_id,
            UserCategory.user_id == user_id
        ).first()

        if not category:
            return None, 0

        old_name = category.name
        affected_count = 0

        # Update category fields
        for key, value in data.items():
            if value is not None:
                setattr(category, key, value)

        # Cascade name change to transactions if name was updated
        if cascade_to_transactions and data.get('name') and data['name'] != old_name:
            affected_count = db.query(Transaction).filter(
                Transaction.user_id == user_id,
                Transaction.category == old_name
            ).update({'category': data['name']}, synchronize_session='fetch')

        db.commit()
        db.refresh(category)
        return category, affected_count

    @staticmethod
    def delete(db: Session, user_id: int, category_id: int) -> bool:
        """Delete a custom category."""
        category = db.query(UserCategory).filter(
            UserCategory.id == category_id,
            UserCategory.user_id == user_id
        ).first()
        if not category:
            return False
        db.delete(category)
        db.commit()
        return True

    @staticmethod
    def get_by_name(db: Session, user_id: int, name: str) -> UserCategory | None:
        """Check if category name exists for user."""
        return db.query(UserCategory).filter(
            UserCategory.user_id == user_id,
            UserCategory.name == name
        ).first()
