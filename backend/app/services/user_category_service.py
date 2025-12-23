"""User category service."""
from sqlalchemy.orm import Session

from ..models.user_category import UserCategory


class UserCategoryService:
    """Service for managing user categories."""

    @staticmethod
    def get_all(db: Session, user_id: int) -> list[UserCategory]:
        """Get all custom categories for a user."""
        return db.query(UserCategory).filter(
            UserCategory.user_id == user_id
        ).order_by(UserCategory.created_at.desc()).all()

    @staticmethod
    def create(db: Session, user_id: int, data: dict) -> UserCategory:
        """Create a new custom category."""
        category = UserCategory(user_id=user_id, **data)
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

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
