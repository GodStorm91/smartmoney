"""Goal database model."""
from datetime import date, datetime

from sqlalchemy import BigInteger, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base


class Goal(Base):
    """Goal model for tracking financial targets."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Goal type and name
    goal_type: Mapped[str] = mapped_column(String(30), nullable=False, default="custom")
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Core goal fields
    years: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-10 years
    target_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)  # JPY in integers
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Priority and account linking
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )

    # AI-generated advice
    ai_advice: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Milestone timestamps
    milestone_25_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    milestone_50_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    milestone_75_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    milestone_100_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Foreign Keys
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Relationships
    account: Mapped["Account"] = relationship("Account", lazy="select")  # type: ignore

    __table_args__ = (
        CheckConstraint("years >= 1 AND years <= 10", name="valid_years"),
        CheckConstraint("target_amount > 0", name="positive_target"),
        Index("ix_goals_user_priority", "user_id", "priority"),
    )
