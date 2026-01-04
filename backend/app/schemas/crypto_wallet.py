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


class PositionPerformanceResponse(BaseModel):
    """Schema for position performance with IL metrics."""

    position_id: str
    protocol: str
    symbol: str
    days_held: int
    start_value_usd: Decimal
    current_value_usd: Decimal
    total_return_usd: Decimal
    total_return_pct: float
    annualized_return_pct: Optional[float] = None
    current_apy: Optional[float] = None
    snapshot_count: int

    # IL metrics (available if price data exists)
    il_percentage: Optional[float] = None
    il_usd: Optional[Decimal] = None
    hodl_value_usd: Optional[Decimal] = None
    lp_vs_hodl_usd: Optional[Decimal] = None
    lp_outperformed_hodl: Optional[bool] = None

    # Yield estimates
    estimated_yield_usd: Optional[Decimal] = None
    estimated_yield_pct: Optional[float] = None


class ILScenarioResponse(BaseModel):
    """Schema for IL scenario analysis."""

    price_change: str
    price_ratio: float
    il_percentage: float
    vs_hodl: str


class PositionInsightsResponse(BaseModel):
    """Schema for AI-generated position insights."""

    summary: str
    il_analysis: Optional[str] = None
    observation: str
    scenario_up: Optional[str] = None
    scenario_down: Optional[str] = None
    risk_level: str  # low, medium, high
    recommendation: Optional[str] = None


class PortfolioInsightsResponse(BaseModel):
    """Schema for AI-generated portfolio insights."""

    diversification_score: str  # well-diversified, moderate, concentrated
    diversification_analysis: str
    risk_observations: list[str] = []
    considerations: list[str] = []
    overall_assessment: str


# Position Reward schemas
class PositionRewardResponse(BaseModel):
    """Schema for position reward response."""

    id: int
    position_id: Optional[str] = None
    wallet_address: str
    chain_id: str
    reward_token_address: str
    reward_token_symbol: Optional[str] = None
    reward_amount: Decimal
    reward_usd: Optional[Decimal] = None
    claimed_at: datetime
    tx_hash: str
    block_number: Optional[int] = None
    source: str
    merkl_campaign_id: Optional[str] = None
    is_attributed: bool
    transaction_id: Optional[int] = None  # Linked transaction ID (if created)
    created_at: datetime

    class Config:
        from_attributes = True


class PositionRewardAttribute(BaseModel):
    """Schema for manually attributing a reward to a position."""

    position_id: str


class BatchRewardAttribute(BaseModel):
    """Schema for batch attributing multiple rewards to a position."""

    reward_ids: list[int] = Field(..., min_length=1)
    position_id: str


class BatchAttributeResponse(BaseModel):
    """Schema for batch attribution result."""

    attributed: int
    failed: int


class BatchCreateTransactionsRequest(BaseModel):
    """Schema for batch creating transactions from rewards."""

    reward_ids: list[int] = Field(..., min_length=1)


class BatchCreateTransactionsResponse(BaseModel):
    """Schema for batch transaction creation result."""

    created: int
    skipped: int
    failed: int
    total_usd: float


class RewardsScanRequest(BaseModel):
    """Schema for reward scan request."""

    days: int = Field(default=90, ge=1, le=365)


class RewardsScanResponse(BaseModel):
    """Schema for reward scan result."""

    scanned_claims: int
    new_claims: int
    matched: int
    unmatched: int


class TokenTotal(BaseModel):
    """Schema for token total amount."""

    symbol: str
    amount: Decimal
    amount_usd: Optional[Decimal] = None


class MonthlyRewardTotal(BaseModel):
    """Schema for monthly reward breakdown."""

    month: str  # YYYY-MM format
    symbol: str
    amount: Decimal
    amount_usd: Optional[Decimal] = None
    count: int


class PositionROIResponse(BaseModel):
    """Schema for position ROI including rewards."""

    position_id: str
    current_value_usd: Decimal
    cost_basis_usd: Optional[Decimal] = None
    total_rewards_usd: Decimal
    rewards_count: int
    rewards_by_token: list[TokenTotal] = []
    rewards_by_month: list[MonthlyRewardTotal] = []
    simple_roi_pct: Optional[float] = None
    annualized_roi_pct: Optional[float] = None
    days_held: Optional[int] = None


class StakingRewardsResponse(BaseModel):
    """Schema for staking rewards summary (e.g., Symbiotic)."""

    source: str
    total_rewards_usd: Decimal
    rewards_count: int
    rewards_by_token: list[TokenTotal] = []
    rewards_by_month: list[MonthlyRewardTotal] = []


class PositionCostBasisCreate(BaseModel):
    """Schema for creating a cost basis entry."""

    position_id: str
    wallet_address: str = Field(..., min_length=42, max_length=42, pattern=r"^0x[a-fA-F0-9]{40}$")
    chain_id: str = "polygon"
    vault_address: str = Field(..., min_length=42, max_length=42, pattern=r"^0x[a-fA-F0-9]{40}$")
    total_usd: Decimal
    deposited_at: datetime
    tx_hash: str = Field(..., min_length=66, max_length=66)
    token_a_symbol: Optional[str] = None
    token_a_amount: Optional[Decimal] = None
    token_b_symbol: Optional[str] = None
    token_b_amount: Optional[Decimal] = None

    @field_validator("wallet_address", "vault_address")
    @classmethod
    def lowercase_address(cls, v: str) -> str:
        return v.lower()


class PositionCostBasisResponse(BaseModel):
    """Schema for cost basis response."""

    id: int
    position_id: str
    wallet_address: str
    chain_id: str
    vault_address: str
    token_a_symbol: Optional[str] = None
    token_a_amount: Optional[Decimal] = None
    token_b_symbol: Optional[str] = None
    token_b_amount: Optional[Decimal] = None
    total_usd: Decimal
    deposited_at: datetime
    tx_hash: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== HODL Scenarios ====================

class HodlScenarioItem(BaseModel):
    """Schema for individual HODL scenario."""

    name: str  # e.g., "100% WETH", "50/50 HODL", "Current LP"
    symbol: str
    type: str  # single_token, hodl_balanced, lp
    value_usd: Decimal
    return_pct: float
    return_usd: Decimal


class HodlScenariosResponse(BaseModel):
    """Schema for HODL scenarios comparison."""

    initial_date: str
    current_date: str
    days_held: int
    initial_value_usd: Decimal
    tokens: list[str]
    scenarios: list[HodlScenarioItem]
    winner: Optional[str] = None
    winner_vs_lp_usd: Decimal = Decimal(0)


# Update forward reference
CryptoWalletWithBalanceResponse.model_rebuild()
