"""Budget database models."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .transaction import Base

if TYPE_CHECKING:
    from .budget_alert import BudgetAlert


class Budget(Base):
    """Monthly budget for a user."""

    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[str] = mapped_column(String(7), nullable=False)  # "2025-11"
    monthly_income: Mapped[int] = mapped_column(BigInteger, nullable=False)
    savings_target: Mapped[int] = mapped_column(BigInteger, nullable=True)
    advice: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Version tracking fields
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    copied_from_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("budgets.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    allocations: Mapped[list["BudgetAllocation"]] = relationship(
        back_populates="budget", cascade="all, delete-orphan"
    )
    feedback_history: Mapped[list["BudgetFeedback"]] = relationship(
        back_populates="budget", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["BudgetAlert"]] = relationship(
        "BudgetAlert", back_populates="budget", cascade="all, delete-orphan"
    )
    # Self-referential relationship for copy source
    copied_from: Mapped[Optional["Budget"]] = relationship(
        "Budget", remote_side=[id], foreign_keys=[copied_from_id]
    )

    __table_args__ = (
        # Only one active budget per user per month
        Index("ix_budget_user_month_active", "user_id", "month", unique=True, postgresql_where=(is_active == True)),
        # Keep the old index for backward compatibility during migration
        Index("ix_budget_user_month", "user_id", "month"),
    )


class BudgetAllocation(Base):
    """Budget allocation per category."""

    __tablename__ = "budget_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    budget_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationship
    budget: Mapped["Budget"] = relationship(back_populates="allocations")


class BudgetFeedback(Base):
    """User feedback for budget regeneration."""

    __tablename__ = "budget_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    budget_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Relationship
    budget: Mapped["Budget"] = relationship(back_populates="feedback_history")
