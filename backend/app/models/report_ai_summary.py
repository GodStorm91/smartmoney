"""AI-generated report summary cache model."""
from datetime import datetime

from sqlalchemy import (
    DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from .transaction import Base


class ReportAISummary(Base):
    """Cached AI summary for a monthly report."""

    __tablename__ = "report_ai_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    language: Mapped[str] = mapped_column(String(5), default="ja")
    win: Mapped[str] = mapped_column(Text, nullable=False)
    warning: Mapped[str] = mapped_column(Text, nullable=False)
    trend: Mapped[str] = mapped_column(Text, nullable=False)
    credits_used: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", "language",
                         name="uq_report_ai_summary"),
    )
