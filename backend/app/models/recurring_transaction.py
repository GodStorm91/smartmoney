"""Recurring transaction model for auto-creating repeated transactions."""
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base

if TYPE_CHECKING:
    from .account import Account
    from .user import User


class RecurringTransaction(Base):
    """Model for recurring transactions that auto-create transactions on schedule."""

    __tablename__ = "recurring_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    is_income: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Frequency settings
    frequency: Mapped[str] = mapped_column(String(20), nullable=False)  # weekly, monthly, yearly, custom
    interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)  # for custom: every N days
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-6 for weekly (0=Monday)
    day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-31 for monthly

    # Scheduling
    next_run_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    last_run_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="recurring_transactions", lazy="select")
    account: Mapped["Account | None"] = relationship("Account", back_populates="recurring_transactions", lazy="select")
