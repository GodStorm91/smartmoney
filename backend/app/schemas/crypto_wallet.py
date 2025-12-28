"""Crypto wallet schemas for API validation."""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


ChainId = Literal["eth", "bsc", "polygon", "arbitrum", "optimism"]
SyncStatus = Literal["pending", "syncing", "synced", "error"]


class CryptoWalletBase(BaseModel):
    """Base crypto wallet schema."""

    wallet_address: str = Field(
        ..., min_length=42, max_length=42, pattern=r"^0x[a-fA-F0-9]{40}$",
        description="EVM wallet address (0x...)"
    )
    label: Optional[str] = Field(None, max_length=100, description="Optional wallet label")
    chains: list[ChainId] = Field(
        default=["eth", "bsc", "polygon"],
        description="Chains to track for this wallet"
    )

    @field_validator("wallet_address")
    @classmethod
    def lowercase_address(cls, v: str) -> str:
        return v.lower()


class CryptoWalletCreate(CryptoWalletBase):
    """Schema for creating a crypto wallet."""

    pass


class CryptoWalletUpdate(BaseModel):
    """Schema for updating a crypto wallet."""

    label: Optional[str] = Field(None, max_length=100)
    chains: Optional[list[ChainId]] = None
    is_active: Optional[bool] = None


class CryptoWalletResponse(CryptoWalletBase):
    """Schema for crypto wallet response."""

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CryptoWalletWithBalanceResponse(CryptoWalletResponse):
    """Schema for crypto wallet with balance info."""

    total_balance_usd: Decimal = Field(default=Decimal("0"), description="Total balance across all chains in USD")
    sync_statuses: list["CryptoSyncStateResponse"] = Field(default=[], description="Sync state per chain")

    class Config:
        from_attributes = True


# Reward Contract schemas
class RewardContractBase(BaseModel):
    """Base reward contract schema."""

    chain_id: ChainId = Field(..., description="Chain where contract is deployed")
    contract_address: str = Field(
        ..., min_length=42, max_length=42, pattern=r"^0x[a-fA-F0-9]{40}$",
        description="Contract address (0x...)"
    )
    label: Optional[str] = Field(None, max_length=100, description="Contract label (e.g., 'USDC-WETH LP Rewards')")
    token_symbol: Optional[str] = Field(None, max_length=20, description="Reward token symbol (e.g., 'STEER')")
    token_decimals: int = Field(default=18, ge=0, le=18, description="Token decimals")

    @field_validator("contract_address")
    @classmethod
    def lowercase_address(cls, v: str) -> str:
        return v.lower()


class RewardContractCreate(RewardContractBase):
    """Schema for creating a reward contract."""

    pass


class RewardContractUpdate(BaseModel):
    """Schema for updating a reward contract."""

    label: Optional[str] = Field(None, max_length=100)
    token_symbol: Optional[str] = Field(None, max_length=20)
    token_decimals: Optional[int] = Field(None, ge=0, le=18)
    is_active: Optional[bool] = None


class RewardContractResponse(RewardContractBase):
    """Schema for reward contract response."""

    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Crypto Sync State schemas
class CryptoSyncStateResponse(BaseModel):
    """Schema for crypto sync state response."""

    id: int
    wallet_address: str
    chain_id: ChainId
    last_sync_at: Optional[datetime]
    last_balance_usd: Optional[Decimal]
    sync_status: SyncStatus
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Reward Claim schemas
class RewardClaimBase(BaseModel):
    """Base reward claim schema."""

    wallet_address: str
    chain_id: ChainId
    tx_hash: str = Field(..., min_length=66, max_length=66)
    from_contract: str
    token_address: Optional[str] = None
    token_symbol: Optional[str] = None
    token_amount: Optional[Decimal] = None
    fiat_value: Optional[Decimal] = None
    fiat_currency: str = Field(default="USD", max_length=3)
    token_price: Optional[Decimal] = None
    block_number: Optional[int] = None
    block_timestamp: Optional[datetime] = None


class RewardClaimResponse(RewardClaimBase):
    """Schema for reward claim response."""

    id: int
    transaction_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Portfolio/Balance schemas (for Zerion API responses)
class TokenBalance(BaseModel):
    """Token balance from Zerion API."""

    chain_id: str = ""
    token_address: str = ""  # Empty for native tokens (ETH, BNB, etc.)
    symbol: str = ""
    name: str = ""
    decimals: int = 18
    balance: Decimal = Decimal("0")
    balance_usd: Decimal = Decimal("0")
    price_usd: Optional[Decimal] = None
    logo_url: Optional[str] = None


class ChainBalance(BaseModel):
    """Balance summary per chain."""

    chain_id: str
    chain_name: str
    total_usd: Decimal
    native_balance: Optional[TokenBalance] = None
    tokens: list[TokenBalance] = []


class PortfolioResponse(BaseModel):
    """Full portfolio response."""

    wallet_address: str
    total_balance_usd: Decimal
    chains: list[ChainBalance] = []
    last_sync_at: Optional[datetime] = None


# LP/DeFi Position schemas
PositionType = Literal["deposit", "stake", "borrow", "reward", "liquidity"]


class DefiPosition(BaseModel):
    """DeFi/LP position from Zerion API."""

    id: str = ""
    chain_id: str = ""
    protocol: str = ""
    protocol_id: str = ""
    protocol_module: str = ""  # liquidity_pool, staking, lending
    position_type: str = "deposit"  # deposit, stake, borrow, reward
    name: str = ""
    symbol: str = ""
    token_name: str = ""
    balance: Decimal = Decimal("0")
    balance_usd: Decimal = Decimal("0")
    price_usd: Optional[Decimal] = None
    logo_url: Optional[str] = None


class DefiPositionsResponse(BaseModel):
    """DeFi positions response for a wallet."""

    wallet_address: str
    total_value_usd: Decimal = Decimal("0")
    positions: list[DefiPosition] = []
    last_sync_at: Optional[datetime] = None


# DeFi Position Snapshot schemas (for historical tracking)
class DefiPositionSnapshotResponse(BaseModel):
    """Schema for position snapshot response."""

    id: int
    position_id: str
    protocol: str
    chain_id: str
    position_type: str
    symbol: str
    token_name: Optional[str] = None
    balance: Decimal
    balance_usd: Decimal
    price_usd: Optional[Decimal] = None
    protocol_apy: Optional[Decimal] = None
    snapshot_date: datetime

    class Config:
        from_attributes = True


class PositionHistoryResponse(BaseModel):
    """Schema for position history with performance metrics."""

    position_id: str
    protocol: str
    symbol: str
    current_value_usd: Decimal
    snapshots: list[DefiPositionSnapshotResponse] = []

    # Calculated performance fields
    change_7d_usd: Optional[Decimal] = None
    change_7d_pct: Optional[float] = None
    change_30d_usd: Optional[Decimal] = None
    change_30d_pct: Optional[float] = None


class WalletPerformanceResponse(BaseModel):
    """Schema for wallet-level performance summary."""

    wallet_address: str
    total_value_usd: Decimal
    total_change_7d_usd: Optional[Decimal] = None
    total_change_30d_usd: Optional[Decimal] = None
    positions: list[PositionHistoryResponse] = []
    snapshot_count: int = 0
    first_snapshot_date: Optional[datetime] = None


class BackfillResponse(BaseModel):
    """Schema for backfill operation response."""

    message: str
    stats: dict


# Update forward reference
CryptoWalletWithBalanceResponse.model_rebuild()
