"""Transaction database model."""

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func

if TYPE_CHECKING:
    from .account import Account
    from .receipt import Receipt


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


class Transaction(Base):
    """Transaction model for storing financial transactions."""

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[int] = mapped_column(
        BigInteger, nullable=False
    )  # Amount in account's native currency
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="JPY"
    )  # ISO currency code (JPY, USD, VND)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_income: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_transfer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_adjustment: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    transfer_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    transfer_type: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # outgoing, incoming, fee
    month_key: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # YYYY-MM
    tx_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)  # SHA-256
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Crypto transaction fields (for reward claims)
    token_symbol: Mapped[str | None] = mapped_column(String(20), nullable=True)
    token_amount: Mapped[float | None] = mapped_column(Numeric(30, 18), nullable=True)
    chain_id: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Receipt attachment
    receipt_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Foreign Keys
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    account_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Relationships
    account: Mapped["Account | None"] = relationship(
        "Account", back_populates="transactions", lazy="select"
    )
    # tags: Mapped[list["Tag"]] = relationship(
    #     "Tag", secondary="transaction_tags", back_populates="transactions", lazy="select"
    # )
    receipt: Mapped["Receipt | None"] = relationship(
        "Receipt", back_populates="transaction", lazy="select"
    )

    __table_args__ = (
        Index("ix_duplicate_check", "date", "amount", "description", "source"),
        Index("ix_month_category", "month_key", "category"),
        CheckConstraint("amount != 0", name="amount_nonzero"),
    )
