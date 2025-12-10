"""Transaction schemas for API validation."""
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    """Base transaction schema."""

    date: date
    description: str = Field(..., max_length=500)
    amount: int = Field(..., description="Amount in JPY as integer")
    category: str = Field(..., max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)
    source: str = Field(..., max_length=100)
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    is_income: bool = False
    is_transfer: bool = False


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction."""

    pass


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    date: Optional[date] = None
    description: Optional[str] = Field(None, max_length=500)
    amount: Optional[int] = Field(None, description="Amount in JPY as integer")
    category: Optional[str] = Field(None, max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)
    source: Optional[str] = Field(None, max_length=100)
    payment_method: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    is_income: Optional[bool] = None
    is_transfer: Optional[bool] = None


class TransactionResponse(TransactionBase):
    """Schema for transaction response."""

    id: int
    month_key: str
    tx_hash: str

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


class TransactionSuggestion(BaseModel):
    """Schema for autocomplete suggestion."""

    description: str
    amount: int
    category: str
    is_income: bool
    count: int
