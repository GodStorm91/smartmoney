"""Transaction schemas for API validation."""
from datetime import date
from typing import Union

from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    """Base transaction schema."""

    date: date
    description: str = Field(..., max_length=500)
    amount: int = Field(..., description="Amount in JPY as integer")
    category: str = Field(..., max_length=100)
    subcategory: Union[str, None] = Field(None, max_length=100)
    source: str = Field(..., max_length=100)
    payment_method: Union[str, None] = Field(None, max_length=100)
    notes: Union[str, None] = Field(None, max_length=1000)
    is_income: bool = False
    is_transfer: bool = False


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction."""

    pass


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    date: Union[date, None] = None
    description: Union[str, None] = Field(None, max_length=500)
    amount: Union[int, None] = Field(None, description="Amount in JPY as integer")
    category: Union[str, None] = Field(None, max_length=100)
    subcategory: Union[str, None] = Field(None, max_length=100)
    source: Union[str, None] = Field(None, max_length=100)
    payment_method: Union[str, None] = Field(None, max_length=100)
    notes: Union[str, None] = Field(None, max_length=1000)
    is_income: Union[bool, None] = None
    is_transfer: Union[bool, None] = None


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
