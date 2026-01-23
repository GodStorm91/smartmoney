"""Notification-related database models."""

from datetime import datetime
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
    Time,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base

if TYPE_CHECKING:
    from .user import User
    from .budget import Budget
    from .bill import Bill


class NotificationPreference(Base):
    """User notification channel preferences."""

    __tablename__ = "notification_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="'push', 'email', 'in_app'"
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        comment="{'frequency_limit': 60, 'quiet_hours': '22:00-07:00', 'critical_only': false}",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_notification_prefs_user_channel", "user_id", "channel", unique=True),
    )


class PushSubscription(Base):
    """FCM push notification subscriptions."""

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    p256dh: Mapped[str] = mapped_column(String(100), nullable=False)
    auth: Mapped[str] = mapped_column(String(100), nullable=False)
    browser: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_push_subscriptions_user", "user_id", "is_active"),)


class InAppNotification(Base):
    """In-app notifications stored for user retrieval."""

    __tablename__ = "in_app_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="'budget_alert', 'bill_reminder', 'anomaly_detected', 'goal_milestone', 'savings_tip'",
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        comment="{'budget_id': 1, 'category': 'Food', 'transaction_id': 123}",
    )
    priority: Mapped[int] = mapped_column(
        Integer, default=3, comment="1=critical, 2=high, 3=normal, 4=low"
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    action_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="in_app_notifications")

    __table_args__ = (
        Index("ix_inapp_notifications_user_unread", "user_id", "is_read"),
        Index("ix_inapp_notifications_created", "created_at"),
        Index("ix_inapp_notifications_type", "type"),
    )


class NotificationLog(Base):
    """Notification delivery tracking logs."""

    __tablename__ = "notification_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    notification_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("in_app_notifications.id", ondelete="SET NULL"), nullable=True
    )
    channel: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="'push', 'email', 'in_app'"
    )
    notification_type: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="Type of notification"
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        comment="'pending', 'sent', 'delivered', 'failed', 'clicked'",
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_id: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="FCM message ID or email ID"
    )
    extra_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    clicked_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_notification_logs_user_created", "user_id", "created_at"),
        Index("ix_notification_logs_status", "status"),
        Index("ix_notification_logs_channel", "channel"),
    )


class BillReminderSchedule(Base):
    """Bill reminder scheduling configuration."""

    __tablename__ = "bill_reminder_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bill_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reminder_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="'days_before', 'specific_date', 'recurring'"
    )
    days_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reminder_time: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, comment="Combined date+time for next reminder"
    )
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    bill: Mapped["Bill"] = relationship("Bill", back_populates="reminder_schedules")

    __table_args__ = (
        Index("ix_bill_reminder_bill", "bill_id", "is_sent"),
        Index("ix_bill_reminder_next", "reminder_time", "is_sent"),
    )


class BurnRateAlert(Base):
    """Burn rate monitoring alerts."""

    __tablename__ = "burn_rate_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    budget_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=True
    )
    month_key: Mapped[str] = mapped_column(String(7), nullable=False, comment="YYYY-MM")
    burn_rate: Mapped[float] = mapped_column(nullable=False, comment="e.g., 1.35 = 35% over pace")
    days_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    projected_spending: Mapped[int] = mapped_column(BigInteger, nullable=False)
    projected_balance: Mapped[int] = mapped_column(BigInteger, nullable=False)
    recommended_daily_budget: Mapped[int] = mapped_column(BigInteger, nullable=False)
    suggested_reduction: Mapped[int] = mapped_column(BigInteger, default=0)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="burn_rate_alerts")

    __table_args__ = (
        Index("ix_burn_rate_alerts_user_month", "user_id", "month_key"),
        Index("ix_burn_rate_alerts_unread", "user_id", "is_read"),
    )


class QueuedNotification(Base):
    """Notifications queued for delivery after quiet hours or rate limit recovery."""

    __tablename__ = "queued_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    priority: Mapped[int] = mapped_column(Integer, default=3)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    action_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_queued_notifications_user_priority", "user_id", "priority"),
        Index("ix_queued_notifications_next_attempt", "next_attempt_at", "completed_at"),
    )
