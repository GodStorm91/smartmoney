"""Budget database models."""
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .transaction import Base


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

    # Relationships
    allocations: Mapped[list["BudgetAllocation"]] = relationship(
        back_populates="budget", cascade="all, delete-orphan"
    )
    feedback_history: Mapped[list["BudgetFeedback"]] = relationship(
        back_populates="budget", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_budget_user_month_unique", "user_id", "month", unique=True),
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
