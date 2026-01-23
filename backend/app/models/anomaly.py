"""Anomaly detection database models."""

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
    from .transaction import Transaction


class AnomalyAlert(Base):
    """Anomaly alert for detecting unusual transactions or spending patterns."""

    __tablename__ = "anomaly_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="large_transaction, category_shift, duplicate, recurring_change, ml_detected",
    )
    severity: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="1-5, where 5 is most severe"
    )
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="anomaly_alerts")
    transaction: Mapped["Transaction | None"] = relationship(
        "Transaction", back_populates="anomaly_alerts"
    )

    __table_args__ = (
        Index("ix_anomaly_alerts_user_created", "user_id", "created_at", postgresql_using="btree"),
        Index("ix_anomaly_alerts_unread", "user_id", "is_read"),
        Index("ix_anomaly_alerts_type", "type"),
        Index("ix_anomaly_alerts_severity", "severity"),
    )


class AnomalyConfig(Base):
    """User configuration for anomaly detection sensitivity and thresholds."""

    __tablename__ = "anomaly_config"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    sensitivity: Mapped[str] = mapped_column(
        String(20), default="medium", comment="low, medium, high"
    )
    large_transaction_threshold: Mapped[int] = mapped_column(BigInteger, default=10000)
    unusual_spending_percent: Mapped[int] = mapped_column(Integer, default=50)
    recurring_change_percent: Mapped[int] = mapped_column(Integer, default=20)
    duplicate_charge_hours: Mapped[int] = mapped_column(Integer, default=24)
    notification_channels: Mapped[list[str] | None] = mapped_column(JSONB, default=["in-app"])
    enabled_types: Mapped[list[str] | None] = mapped_column(
        JSONB,
        default=["large_transaction", "category_shift", "duplicate"],
        comment="Array of enabled anomaly types",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="anomaly_config")
