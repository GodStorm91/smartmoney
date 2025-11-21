"""Goal database model."""
from datetime import date, datetime

from sqlalchemy import BigInteger, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from .transaction import Base


class Goal(Base):
    """Goal model for tracking financial targets."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    years: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 3, 5, or 10
    target_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # JPY in integers
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Foreign Keys
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    __table_args__ = (
        CheckConstraint("years >= 1 AND years <= 10", name="valid_years"),
        CheckConstraint("target_amount > 0", name="positive_target"),
        Index("ix_user_years_unique", "user_id", "years", unique=True),
    )
