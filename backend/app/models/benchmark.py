"""Spending benchmark model."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .transaction import Base


class SpendingBenchmark(Base):
    """Spending benchmark data from 家計調査 (Household Survey)."""

    __tablename__ = "spending_benchmarks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    data_year: Mapped[int] = mapped_column(Integer, nullable=False)
    prefecture_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    region: Mapped[str | None] = mapped_column(String(20), nullable=True)
    income_quintile: Mapped[int | None] = mapped_column(Integer, nullable=True)
    household_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(50), nullable=True)
    monthly_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    sample_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
