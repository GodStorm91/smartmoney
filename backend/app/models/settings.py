"""Settings database model."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from .transaction import Base


class AppSettings(Base):
    """Application settings model - one per user."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    currency: Mapped[str] = mapped_column(String(3), default="JPY", nullable=False)
    base_currency: Mapped[str] = mapped_column(String(3), default="JPY", nullable=False)
    starting_net_worth: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    base_date: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Foreign Keys - user_id is required for multi-user support
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    # Budget settings
    budget_carry_over: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    budget_email_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        CheckConstraint("base_date >= 1 AND base_date <= 31", name="valid_base_date"),
    )
