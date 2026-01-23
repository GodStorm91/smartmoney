"""Budget alert database models."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base

if TYPE_CHECKING:
    from .budget import Budget
    from .user import User


class BudgetAlert(Base):
    """Budget alert for tracking spending thresholds."""

    __tablename__ = "budget_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    budget_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    alert_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="warning, over_budget, threshold_50, threshold_80, threshold_100",
    )
    threshold_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    current_spending: Mapped[int] = mapped_column(BigInteger, nullable=False)
    budget_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    amount_remaining: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Relationships
    budget: Mapped["Budget"] = relationship("Budget", back_populates="alerts")

    __table_args__ = (
        Index("ix_budget_alerts_user_created", "user_id", "created_at"),
        Index("ix_budget_alerts_budget_unread", "budget_id", "is_read"),
        Index("ix_budget_alerts_category", "category"),
    )
