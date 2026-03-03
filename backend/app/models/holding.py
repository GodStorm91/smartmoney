"""Holding and HoldingLot models for investment tracking."""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base

if TYPE_CHECKING:
    from .account import Account
    from .user import User


class Holding(Base):
    """Model for tracking investment holdings (gold, stocks, ETFs, bonds, etc.)."""

    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    asset_name: Mapped[str] = mapped_column(String(200), nullable=False)
    asset_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # commodity, stock, etf, bond, crypto, other
    ticker: Mapped[str | None] = mapped_column(String(20), nullable=True)
    unit_label: Mapped[str] = mapped_column(String(20), nullable=False, default="units")
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="JPY")

    # Aggregated totals (recalculated from lots)
    total_units: Mapped[Decimal] = mapped_column(
        Numeric(18, 8), nullable=False, default=0
    )
    total_cost_basis: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    # Current price (manually updated)
    current_price_per_unit: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True
    )
    current_price_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    lots: Mapped[list["HoldingLot"]] = relationship(
        "HoldingLot",
        back_populates="holding",
        lazy="select",
        cascade="all, delete-orphan",
        order_by="HoldingLot.date.desc()",
    )

    __table_args__ = (
        Index("ix_holdings_user_active", "user_id", "is_active"),
    )


class HoldingLot(Base):
    """Model for individual buy/sell/dividend lots within a holding."""

    __tablename__ = "holding_lots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    holding_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("holdings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # buy, sell, dividend
    date: Mapped[date] = mapped_column(Date, nullable=False)
    units: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    price_per_unit: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    fee_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Relationships
    holding: Mapped["Holding"] = relationship(
        "Holding", back_populates="lots", lazy="select"
    )
