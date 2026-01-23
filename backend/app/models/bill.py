"""Bill reminder database models."""

from datetime import date, datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Time,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base

if TYPE_CHECKING:
    from .user import User
    from .recurring_transaction import RecurringTransaction
    from .notification import BillReminderSchedule


class Bill(Base):
    """Bill reminder for tracking recurring payments."""

    __tablename__ = "bills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(
        String(7), nullable=True, comment="Hex color for calendar"
    )

    # Due date configuration
    due_day: Mapped[int] = mapped_column(Integer, nullable=False, comment="Day of month (1-31)")
    due_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(9, 0))

    # Recurrence configuration
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    recurrence_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="monthly",
        comment="weekly, biweekly, monthly, quarterly, yearly, custom",
    )
    recurrence_config: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, comment="Custom recurrence settings"
    )

    # Next occurrence tracking
    next_due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    last_paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Reminder configuration
    reminder_days_before: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3, comment="1, 3, or 7 days before"
    )
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_reminder_sent: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Status
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paid_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Recurring Transaction Link (auto-sync feature)
    recurring_transaction_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("recurring_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sync_with_recurring: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="bills", lazy="select")
    recurring_transaction: Mapped["RecurringTransaction | None"] = relationship(
        "RecurringTransaction", back_populates="linked_bill", lazy="select"
    )
    history: Mapped[list["BillHistory"]] = relationship(
        "BillHistory", back_populates="bill", cascade="all, delete-orphan"
    )
    reminder_schedules: Mapped[list["BillReminderSchedule"]] = relationship(
        "BillReminderSchedule", back_populates="bill", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_bills_user_active", "user_id", "is_active"),
        Index("ix_bills_next_due", "next_due_date"),
        Index("ix_bills_category", "category"),
        Index("ix_bills_recurring", "is_recurring"),
    )


class BillHistory(Base):
    """Bill payment history for tracking paid bills."""

    __tablename__ = "bill_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True
    )
    paid_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_paid: Mapped[int] = mapped_column(BigInteger, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Relationship
    bill: Mapped["Bill"] = relationship("Bill", back_populates="history")

    __table_args__ = (
        Index("ix_bill_history_bill", "bill_id"),
        Index("ix_bill_history_paid_date", "paid_date"),
    )
