"""Pydantic schemas for holdings and lots."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class HoldingCreate(BaseModel):
    """Schema for creating a new holding."""

    asset_name: str = Field(..., max_length=200)
    asset_type: str = Field(..., max_length=50, description="commodity, stock, etf, bond, crypto, other")
    ticker: Optional[str] = Field(None, max_length=20)
    unit_label: str = Field(default="units", max_length=20)
    currency: str = Field(default="JPY", max_length=3)
    account_id: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=1000)


class HoldingUpdate(BaseModel):
    """Schema for updating a holding."""

    asset_name: Optional[str] = Field(None, max_length=200)
    asset_type: Optional[str] = Field(None, max_length=50)
    ticker: Optional[str] = Field(None, max_length=20)
    unit_label: Optional[str] = Field(None, max_length=20)
    currency: Optional[str] = Field(None, max_length=3)
    account_id: Optional[int] = None
    current_price_per_unit: Optional[int] = None
    current_price_date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class HoldingResponse(BaseModel):
    """Schema for holding response."""

    id: int
    user_id: int
    account_id: Optional[int] = None
    asset_name: str
    asset_type: str
    ticker: Optional[str] = None
    unit_label: str
    currency: str
    total_units: str  # Decimal serialized as string
    total_cost_basis: int
    current_price_per_unit: Optional[int] = None
    current_price_date: Optional[date] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: str
    updated_at: str

    # Computed fields
    avg_cost_per_unit: float = 0.0
    current_value: Optional[int] = None
    unrealized_pnl: Optional[int] = None
    pnl_percentage: Optional[float] = None

    class Config:
        from_attributes = True


class LotCreate(BaseModel):
    """Schema for creating a lot (buy/sell/dividend)."""

    type: str = Field(..., max_length=20, description="buy, sell, or dividend")
    date: date
    units: str = Field(..., description="Decimal units as string")
    price_per_unit: int
    total_amount: int
    fee_amount: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=500)


class LotResponse(BaseModel):
    """Schema for lot response."""

    id: int
    holding_id: int
    user_id: int
    type: str
    date: date
    units: str  # Decimal serialized as string
    price_per_unit: int
    total_amount: int
    fee_amount: Optional[int] = None
    notes: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class HoldingWithLotsResponse(HoldingResponse):
    """Schema for holding with its lots."""

    lots: list[LotResponse] = []


class HoldingListResponse(BaseModel):
    """Schema for list of holdings."""

    holdings: list[HoldingResponse]
    total: int


class PriceUpdateRequest(BaseModel):
    """Schema for quick price update."""

    price: int
    date: str = Field(..., description="Date in YYYY-MM-DD format")


class PortfolioSummaryResponse(BaseModel):
    """Schema for portfolio summary."""

    total_value: int
    total_cost: int
    total_pnl: int
    pnl_percentage: float
    holdings_count: int
