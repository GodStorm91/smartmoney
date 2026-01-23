"""Schemas for proxy purchase feature."""
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class ProxyPurchaseCreate(BaseModel):
    """Schema for creating a proxy purchase."""
    client_account_id: int = Field(..., description="Receivable account ID for client")
    item: str = Field(..., min_length=1, max_length=200, description="Item description")
    cost: int = Field(..., gt=0, description="Actual cost in JPY (integer)")
    payment_account_id: int = Field(..., description="Account used for payment")
    markup_price: int = Field(..., gt=0, description="Price charged to client in JPY")
    exchange_rate: float = Field(..., gt=0, description="VND per JPY rate")
    purchase_date: date = Field(..., description="Date of purchase")
    notes: Optional[str] = Field(None, max_length=500, description="Optional notes")


class ProxyPurchaseResponse(BaseModel):
    """Response after creating proxy purchase."""
    proxy_id: str
    expense_transaction_id: int
    receivable_transaction_id: int
    client_charge_vnd: int
    profit_jpy: int


class OutstandingItem(BaseModel):
    """Single outstanding purchase item."""
    transaction_id: int
    item: str
    amount_jpy: int
    charge_vnd: int
    exchange_rate: float
    date: date


class OutstandingClient(BaseModel):
    """Outstanding receivables for a client."""
    client_id: int
    client_name: str
    total_jpy: int
    total_vnd: int
    items: list[OutstandingItem]
    oldest_date: Optional[date]
    item_count: int


class ProxySettleCreate(BaseModel):
    """Schema for settling proxy payment."""
    client_account_id: int = Field(..., description="Receivable account ID")
    transaction_ids: list[int] = Field(..., min_length=1, description="Transaction IDs to settle")
    receive_account_id: int = Field(..., description="Bank account to receive payment")
    vnd_amount: int = Field(..., gt=0, description="Amount received in VND")
    payment_date: date = Field(..., description="Date payment received")


class ProxySettleResponse(BaseModel):
    """Response after settling proxy payment."""
    settlement_id: str
    cleared_transaction_id: int
    income_transaction_id: int
    items_settled: int
