"""Position closure model for tracking closed LP positions."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base


class PositionClosure(Base):
    """Track closed LP positions with P&L."""

    __tablename__ = "position_closures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    wallet_address: Mapped[str] = mapped_column(String(42), nullable=False)
    chain_id: Mapped[str] = mapped_column(String(20), nullable=False)
    protocol: Mapped[str] = mapped_column(String(100), nullable=False)
    symbol: Mapped[str] = mapped_column(String(100), nullable=False)

    # Exit details (user-editable)
    exit_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    exit_value_usd: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    exit_value_jpy: Mapped[int] = mapped_column(BigInteger, nullable=False)
    exit_tx_hash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Auto-calculated P&L
    cost_basis_usd: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    total_rewards_usd: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    realized_pnl_usd: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)
    realized_pnl_jpy: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Linked income transaction
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", lazy="select")
    transaction: Mapped["Transaction | None"] = relationship("Transaction", lazy="select")

    __table_args__ = (
        Index("ix_position_closures_user_position", "user_id", "position_id"),
    )
