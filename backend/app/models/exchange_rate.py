"""ExchangeRate database model."""
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from .transaction import Base


class ExchangeRate(Base):
    """Exchange rate model for currency conversions."""

    __tablename__ = "exchange_rates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    currency: Mapped[str] = mapped_column(String(3), unique=True, nullable=False)
    rate_to_jpy: Mapped[float] = mapped_column(Numeric(20, 8), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (CheckConstraint("rate_to_jpy > 0", name="positive_rate"),)
