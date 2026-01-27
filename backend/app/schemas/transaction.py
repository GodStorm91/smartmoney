"""Transaction schemas for API validation."""
import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    """Base transaction schema."""

    date: datetime.date
    description: str = Field(..., max_length=500)
    amount: int = Field(..., description="Amount in JPY as integer")
    category: str = Field(..., max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)
    source: str = Field(..., max_length=100)
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    is_income: bool = False
    is_transfer: bool = False
    is_adjustment: bool = False


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction."""

    currency: Optional[str] = Field("JPY", max_length=3, description="ISO 4217 currency code")
    account_id: Optional[int] = Field(None, description="Associated account ID")


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    date: Optional[datetime.date] = None
    description: Optional[str] = Field(None, max_length=500)
    amount: Optional[int] = Field(None, description="Amount in currency minor units")
    currency: Optional[str] = Field(None, max_length=3, description="ISO 4217 currency code")
    category: Optional[str] = Field(None, max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)
    source: Optional[str] = Field(None, max_length=100)
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    is_income: Optional[bool] = None
    is_transfer: Optional[bool] = None
    is_adjustment: Optional[bool] = None
    account_id: Optional[int] = None
    receipt_url: Optional[str] = Field(None, max_length=500)


class TransactionResponse(TransactionBase):
    """Schema for transaction response."""

    id: int
    month_key: str
    tx_hash: str
    currency: str = "JPY"
    account_id: Optional[int] = None
    is_adjustment: bool = False
    receipt_url: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    """Schema for paginated transaction list."""

    transactions: list[TransactionResponse]
    total: int
    limit: int
    offset: int


class TransactionSummaryResponse(BaseModel):
    """Schema for transaction summary."""

    income: int
    expenses: int
    net: int
    count: int
