"""Model for tracking dismissed recurring suggestions."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base

if TYPE_CHECKING:
    from .user import User


class DismissedSuggestion(Base):
    """Track which recurring suggestions a user has dismissed."""

    __tablename__ = "dismissed_suggestions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    suggestion_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    dismissed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="dismissed_suggestions", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "suggestion_hash", name="uq_user_suggestion"),
    )
