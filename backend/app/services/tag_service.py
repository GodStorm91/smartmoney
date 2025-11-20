"""Tag service for CRUD operations."""
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.tag import Tag


class TagService:
    """Service for tag operations."""

    @staticmethod
    def create_tag(db: Session, tag_data: dict) -> Tag:
        """Create a new tag.

        Args:
            db: Database session
            tag_data: Tag data dictionary (must include user_id)

        Returns:
            Created tag

        Raises:
            IntegrityError: If tag name already exists for user
        """
        tag = Tag(**tag_data)
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag

    @staticmethod
    def get_tag(db: Session, user_id: int, tag_id: int) -> Optional[Tag]:
        """Get tag by ID for a specific user.

        Args:
            db: Database session
            user_id: User ID
            tag_id: Tag ID

        Returns:
            Tag or None if not found
        """
        return db.query(Tag).filter(
            Tag.id == tag_id,
            Tag.user_id == user_id
        ).first()

    @staticmethod
    def get_tag_by_name(db: Session, user_id: int, name: str) -> Optional[Tag]:
        """Get tag by name for a specific user.

        Args:
            db: Database session
            user_id: User ID
            name: Tag name

        Returns:
            Tag or None if not found
        """
        return db.query(Tag).filter(
            Tag.name == name,
            Tag.user_id == user_id
        ).first()

    @staticmethod
    def get_all_tags(db: Session, user_id: int) -> list[Tag]:
        """Get all tags for a specific user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of tags
        """
        return db.query(Tag).filter(Tag.user_id == user_id).order_by(Tag.name).all()

    @staticmethod
    def update_tag(db: Session, user_id: int, tag_id: int, tag_data: dict) -> Optional[Tag]:
        """Update tag for a specific user.

        Args:
            db: Database session
            user_id: User ID
            tag_id: Tag ID
            tag_data: Updated tag data

        Returns:
            Updated tag or None if not found

        Raises:
            IntegrityError: If new tag name already exists for user
        """
        tag = db.query(Tag).filter(
            Tag.id == tag_id,
            Tag.user_id == user_id
        ).first()
        if not tag:
            return None

        for key, value in tag_data.items():
            if hasattr(tag, key):
                setattr(tag, key, value)

        db.commit()
        db.refresh(tag)
        return tag

    @staticmethod
    def delete_tag(db: Session, user_id: int, tag_id: int) -> bool:
        """Delete tag (cascades to transaction_tags junction table).

        Args:
            db: Database session
            user_id: User ID
            tag_id: Tag ID

        Returns:
            True if deleted, False if not found
        """
        tag = db.query(Tag).filter(
            Tag.id == tag_id,
            Tag.user_id == user_id
        ).first()
        if not tag:
            return False

        db.delete(tag)
        db.commit()
        return True
