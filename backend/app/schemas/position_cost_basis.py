"""Position cost-basis schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field

BasisSource = Literal["manual", "derived"]


class SetCostBasisRequest(BaseModel):
    """Request to set or clear a manual position cost basis."""

    position_id: str = Field(..., min_length=1, max_length=255)
    manual_basis_usd: Optional[Decimal] = Field(None, ge=0)
    note: Optional[str] = Field(None, max_length=500)


class PositionCostBasisResponse(BaseModel):
    """Effective cost-basis response used by MCP write tools."""

    position_id: str
    manual_basis_usd: Optional[Decimal] = None
    derived_basis_usd: Optional[Decimal] = None
    effective_basis_usd: Optional[Decimal] = None
    basis_source: Optional[BasisSource] = None
    note: Optional[str] = None
    updated_at: Optional[datetime] = None
