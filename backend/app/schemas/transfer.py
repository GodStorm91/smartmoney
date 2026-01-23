"""Transfer schemas for API validation."""
import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TransferCreate(BaseModel):
    """Schema for creating a transfer."""

    from_account_id: int = Field(..., description="Source account ID")
    to_account_id: int = Field(..., description="Destination account ID")
    from_amount: int = Field(..., gt=0, description="Amount in source currency (smallest unit)")
    to_amount: int = Field(..., gt=0, description="Amount in target currency (smallest unit)")
    exchange_rate: Optional[float] = Field(None, description="Exchange rate used for conversion")
    fee_amount: int = Field(0, ge=0, description="Transfer fee in source currency")
    date: datetime.date = Field(..., description="Transfer date")
    description: Optional[str] = Field(None, max_length=500, description="Transfer description")


class TransferResponse(BaseModel):
    """Schema for transfer creation response."""

    transfer_id: str
    from_transaction_id: int
    to_transaction_id: int
    fee_transaction_id: Optional[int] = None


class TransferListItem(BaseModel):
    """Schema for transfer list item."""

    transfer_id: str
    from_account_id: int
    from_account_name: str
    from_currency: str
    to_account_id: int
    to_account_name: str
    to_currency: str
    from_amount: int
    to_amount: int
    fee_amount: int
    date: datetime.date
    description: Optional[str] = None

    class Config:
        from_attributes = True
