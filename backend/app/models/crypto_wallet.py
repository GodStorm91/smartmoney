"""Crypto wallet database models."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .transaction import Base


class CryptoWallet(Base):
    """Crypto wallet model for storing EVM wallet addresses."""

    __tablename__ = "crypto_wallets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    wallet_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    chains: Mapped[list] = mapped_column(JSON, nullable=False, default=["eth", "bsc", "polygon"])
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="crypto_wallets", lazy="select")
    sync_states: Mapped[list["CryptoSyncState"]] = relationship(
        "CryptoSyncState", back_populates="wallet", lazy="select", cascade="all, delete-orphan"
    )
    accounts: Mapped[list["Account"]] = relationship(
        "Account", back_populates="crypto_wallet", lazy="select"
    )

    __table_args__ = (
        Index("ix_crypto_wallets_user_address", "user_id", "wallet_address", unique=True),
    )


class RewardContract(Base):
    """Reward contract model for tracking LP reward sources."""

    __tablename__ = "reward_contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chain_id: Mapped[str] = mapped_column(String(20), nullable=False)
    contract_address: Mapped[str] = mapped_column(String(42), nullable=False)
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    token_symbol: Mapped[str | None] = mapped_column(String(20), nullable=True)
    token_decimals: Mapped[int] = mapped_column(Integer, nullable=False, default=18)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="reward_contracts", lazy="select")

    __table_args__ = (
        Index("ix_reward_contracts_user_chain_address", "user_id", "chain_id", "contract_address", unique=True),
    )


class CryptoSyncState(Base):
    """Sync state tracking for crypto wallet balances."""

    __tablename__ = "crypto_sync_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    wallet_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("crypto_wallets.id", ondelete="CASCADE"), nullable=False
    )
    wallet_address: Mapped[str] = mapped_column(String(42), nullable=False)
    chain_id: Mapped[str] = mapped_column(String(20), nullable=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_block_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    last_balance_usd: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    sync_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    wallet: Mapped["CryptoWallet"] = relationship("CryptoWallet", back_populates="sync_states", lazy="select")

    __table_args__ = (
        Index("ix_crypto_sync_user_wallet_chain", "user_id", "wallet_address", "chain_id", unique=True),
    )


class RewardClaim(Base):
    """Detected reward claims from LP positions."""

    __tablename__ = "reward_claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    wallet_address: Mapped[str] = mapped_column(String(42), nullable=False)
    chain_id: Mapped[str] = mapped_column(String(20), nullable=False)
    tx_hash: Mapped[str] = mapped_column(String(66), nullable=False)
    from_contract: Mapped[str] = mapped_column(String(42), nullable=False)
    token_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    token_symbol: Mapped[str | None] = mapped_column(String(20), nullable=True)
    token_amount: Mapped[Decimal | None] = mapped_column(Numeric(30, 18), nullable=True)
    fiat_value: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    fiat_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    token_price: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    block_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    block_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="reward_claims", lazy="select")
    transaction: Mapped["Transaction"] = relationship("Transaction", lazy="select")

    __table_args__ = (
        Index("ix_reward_claims_tx_chain", "tx_hash", "chain_id", unique=True),
    )


class DefiPositionSnapshot(Base):
    """Daily snapshots of DeFi position values for historical tracking."""

    __tablename__ = "defi_position_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    wallet_address: Mapped[str] = mapped_column(String(42), nullable=False)
    position_id: Mapped[str] = mapped_column(String(255), nullable=False)  # Zerion position ID
    protocol: Mapped[str] = mapped_column(String(100), nullable=False)
    chain_id: Mapped[str] = mapped_column(String(20), nullable=False)
    position_type: Mapped[str] = mapped_column(String(50), nullable=False)  # deposit, stake, liquidity
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    token_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    balance: Mapped[Decimal] = mapped_column(Numeric(36, 18), nullable=False)
    balance_usd: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    price_usd: Mapped[Decimal | None] = mapped_column(Numeric(20, 8), nullable=True)
    protocol_apy: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)  # e.g., 12.5% = 12.5000
    snapshot_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", lazy="select")

    __table_args__ = (
        Index("ix_defi_snapshots_user_date", "user_id", "snapshot_date"),
        Index("ix_defi_snapshots_position", "position_id"),
        Index("ix_defi_snapshots_unique", "user_id", "position_id", "snapshot_date", unique=True),
    )


class PositionReward(Base):
    """Claimed rewards linked to LP positions."""

    __tablename__ = "position_rewards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    wallet_address: Mapped[str] = mapped_column(String(42), nullable=False)
    chain_id: Mapped[str] = mapped_column(String(20), nullable=False)

    # Reward details
    reward_token_address: Mapped[str] = mapped_column(String(42), nullable=False)
    reward_token_symbol: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reward_amount: Mapped[Decimal] = mapped_column(Numeric(30, 18), nullable=False)
    reward_usd: Mapped[Decimal | None] = mapped_column(Numeric(18, 2), nullable=True)

    # Claim info
    claimed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    tx_hash: Mapped[str] = mapped_column(String(66), nullable=False, unique=True)
    block_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Attribution
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="merkl")
    merkl_campaign_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_attributed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Transaction link (for creating income transaction from reward)
    transaction_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", lazy="select")
    transaction: Mapped["Transaction | None"] = relationship("Transaction", lazy="select")


class PositionCostBasis(Base):
    """Track initial deposits for ROI calculation."""

    __tablename__ = "position_cost_basis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    wallet_address: Mapped[str] = mapped_column(String(42), nullable=False)
    chain_id: Mapped[str] = mapped_column(String(20), nullable=False)

    # Deposit details
    vault_address: Mapped[str] = mapped_column(String(42), nullable=False)
    token_a_symbol: Mapped[str | None] = mapped_column(String(20), nullable=True)
    token_a_amount: Mapped[Decimal | None] = mapped_column(Numeric(30, 18), nullable=True)
    token_b_symbol: Mapped[str | None] = mapped_column(String(20), nullable=True)
    token_b_amount: Mapped[Decimal | None] = mapped_column(Numeric(30, 18), nullable=True)
    total_usd: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    # Transaction info
    deposited_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    tx_hash: Mapped[str] = mapped_column(String(66), nullable=False)
    block_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User", lazy="select")
