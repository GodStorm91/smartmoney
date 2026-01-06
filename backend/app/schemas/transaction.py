"""Transaction schemas for API validation."""
import datetime
from typing import Union

from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    """Base transaction schema."""

    date: datetime.date
    description: str = Field(..., max_length=500)
    amount: int = Field(..., description="Amount in account's native currency")
    currency: str = Field(default="JPY", max_length=3, description="ISO currency code (JPY, USD, VND)")
    category: str = Field(..., max_length=100)
    subcategory: Union[str, None] = Field(None, max_length=100)
    source: str = Field(..., max_length=100)
    payment_method: Union[str, None] = Field(None, max_length=100)
    notes: Union[str, None] = Field(None, max_length=1000)
    is_income: bool = False
    is_transfer: bool = False
    account_id: Union[int, None] = Field(None, description="Account ID for balance tracking")
    receipt_url: Union[str, None] = Field(None, max_length=500, description="Receipt image URL")


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction."""

    pass


class TransactionUpdate(BaseModel):
    """Schema for updating a transaction."""

    date: Union[datetime.date, None] = None
    description: Union[str, None] = Field(None, max_length=500)
    amount: Union[int, None] = Field(None, description="Amount in account's native currency")
    currency: Union[str, None] = Field(None, max_length=3, description="ISO currency code (JPY, USD, VND)")
    category: Union[str, None] = Field(None, max_length=100)
    subcategory: Union[str, None] = Field(None, max_length=100)
    source: Union[str, None] = Field(None, max_length=100)
    payment_method: Union[str, None] = Field(None, max_length=100)
    notes: Union[str, None] = Field(None, max_length=1000)
    is_income: Union[bool, None] = None
    is_transfer: Union[bool, None] = None
    account_id: Union[int, None] = None
    receipt_url: Union[str, None] = None


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
