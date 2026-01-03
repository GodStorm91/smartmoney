"""Account database model."""
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base


class Account(Base):
    """Account model for storing financial accounts."""

    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    initial_balance: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)  # in cents/smallest unit
    initial_balance_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="JPY")
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Foreign Keys
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    crypto_wallet_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("crypto_wallets.id", ondelete="SET NULL"), nullable=True
    )

    # Account subtype for crypto accounts (native, lp_position, staking, etc.)
    account_subtype: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Relationships
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="account", lazy="select"
    )
    recurring_transactions: Mapped[list["RecurringTransaction"]] = relationship(
        "RecurringTransaction", back_populates="account", lazy="select"
    )
    crypto_wallet: Mapped["CryptoWallet"] = relationship(
        "CryptoWallet", back_populates="accounts", lazy="select"
    )

    __table_args__ = (
        CheckConstraint(
            "type IN ('bank', 'cash', 'credit_card', 'investment', 'receivable', 'crypto', 'savings', 'other')",
            name="valid_account_type",
        ),
        Index("ix_accounts_type_active", "type", "is_active"),
    )
