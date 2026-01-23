"""Insight and savings recommendation database models."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base

if TYPE_CHECKING:
    from .user import User
    from .goal import Goal


class InsightCard(Base):
    """Insight card for proactive spending insights and recommendations."""

    __tablename__ = "insight_cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="spending_trend, budget_warning, goal_progress, forecast, savings_opportunity",
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(
        Integer, default=3, comment="1-5, where 1 is highest priority"
    )
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    action_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="insight_cards")

    __table_args__ = (
        Index("ix_insight_cards_user_created", "user_id", "created_at"),
        Index("ix_insight_cards_unread", "user_id", "is_read"),
        Index("ix_insight_cards_type", "type"),
        Index("ix_insight_cards_priority", "priority"),
    )


class SavingsRecommendation(Base):
    """Personalized savings recommendations for expense reduction."""

    __tablename__ = "savings_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    potential_savings: Mapped[int] = mapped_column(BigInteger, nullable=False)
    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="subscription_cancel, negotiate, reduce_spending, switch_provider, optimize_usage",
    )
    action_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="pending, applied, dismissed, expired"
    )
    applied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="savings_recommendations")

    __table_args__ = (
        Index("ix_savings_recommendations_user_created", "user_id", "created_at"),
        Index("ix_savings_recommendations_status", "user_id", "status"),
        Index("ix_savings_recommendations_potential", "potential_savings"),
    )
