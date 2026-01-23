"""Position closure schemas for API validation."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ClosePositionRequest(BaseModel):
    """Request schema for closing a position."""

    exit_date: datetime
    exit_value_usd: Decimal = Field(..., gt=0)
    exit_value_jpy: int = Field(..., gt=0)
    destination_account_id: int
    note: Optional[str] = Field(None, max_length=255)
    tx_hash: Optional[str] = Field(None, max_length=66)

    # Position info (from frontend)
    wallet_address: str = Field(..., max_length=42)
    chain_id: str
    protocol: str
    symbol: str


class PositionClosureResponse(BaseModel):
    """Response schema for position closure."""

    id: int
    position_id: str
    protocol: str
    symbol: str
    chain_id: str
    wallet_address: str

    exit_date: datetime
    exit_value_usd: Decimal
    exit_value_jpy: int

    cost_basis_usd: Optional[Decimal] = None
    total_rewards_usd: Optional[Decimal] = None
    realized_pnl_usd: Optional[Decimal] = None
    realized_pnl_jpy: Optional[int] = None
    realized_pnl_pct: Optional[float] = None

    transaction_id: Optional[int] = None
    note: Optional[str] = None
    exit_tx_hash: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClosedPositionsSummary(BaseModel):
    """Summary of all closed positions."""

    total_closed: int
    total_exit_value_jpy: int
    total_realized_pnl_jpy: Optional[int] = None
    positions: list[PositionClosureResponse]
