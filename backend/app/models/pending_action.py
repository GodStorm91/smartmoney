"""Pending action database model for insight-to-action layer."""

from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..utils.db_types import JSONBCompat as JSONB
from .transaction import Base

if TYPE_CHECKING:
    from .user import User


class PendingAction(Base):
    """Queued action suggested by the insight engine."""

    __tablename__ = "pending_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="review_uncategorized, copy_or_create_budget, adjust_budget_category, review_goal_catch_up",
    )
    surface: Mapped[str] = mapped_column(String(30), default="dashboard")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    params: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    undo_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        comment="pending, surfaced, executed, dismissed, expired, undone",
    )
    priority: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    surfaced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    tapped_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=lambda: datetime.utcnow() + timedelta(days=7)
    )
    executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    undone_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="pending_actions")

    __table_args__ = (
        Index("ix_pending_action_user_type_status", "user_id", "type", "status"),
        Index("ix_pending_action_user_status", "user_id", "status"),
        Index("ix_pending_action_expires", "expires_at"),
    )
