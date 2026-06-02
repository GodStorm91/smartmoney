"""LP real P&L response schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field


class LpRealPnlPositionResponse(BaseModel):
    """Per-position LP P&L row with explicit data completeness."""

    position_id: str
    wallet_address: str
    chain_id: str
    protocol: str
    symbol: str
    status: Literal["open", "closed"]
    as_of: datetime
    current_value_usd: Optional[Decimal] = None
    exit_value_usd: Optional[Decimal] = None
    cost_basis_usd: Optional[Decimal] = None
    basis_source: Optional[Literal["manual", "derived"]] = None
    total_rewards_usd: Decimal = Decimal("0")
    real_pnl_usd: Optional[Decimal] = None
    real_pnl_pct: Optional[float] = None
    data_completeness: Literal["full", "partial"]
    missing: list[str] = Field(default_factory=list)
    method: str
    note: Optional[str] = None


class LpRealPnlResponse(BaseModel):
    """Aggregated LP real P&L response for MCP and API consumers."""

    chain: str
    wallet_id: Optional[int] = None
    wallet_address: Optional[str] = None
    method: str
    totals_scope: str
    known_total_cost_basis_usd: Decimal = Decimal("0")
    known_total_lp_value_usd: Decimal = Decimal("0")
    known_total_rewards_usd: Decimal = Decimal("0")
    known_total_real_pnl_usd: Decimal = Decimal("0")
    full_positions: int = 0
    partial_positions: int = 0
    positions: list[LpRealPnlPositionResponse] = Field(default_factory=list)
    caveat: str
