"""Account schemas for API validation."""
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


AccountType = Literal["bank", "cash", "credit_card", "investment", "receivable", "crypto", "other"]


class AccountBase(BaseModel):
    """Base account schema."""

    name: str = Field(..., min_length=1, max_length=200, description="Account name")
    type: AccountType = Field(..., description="Account type")
    initial_balance: int = Field(default=0, description="Initial balance in smallest currency unit (cents/yen)")
    initial_balance_date: date = Field(..., description="Date of initial balance")
    currency: str = Field(default="JPY", min_length=3, max_length=3, description="Currency code (e.g., JPY, USD, VND)")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional notes")


class AccountCreate(AccountBase):
    """Schema for creating an account."""

    pass


class AccountUpdate(BaseModel):
    """Schema for updating an account."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[AccountType] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=1000)
    initial_balance: Optional[int] = Field(None, description="Initial balance (for accounts with no transactions)")
    initial_balance_date: Optional[date] = Field(None, description="Initial balance date")
    desired_current_balance: Optional[int] = Field(None, description="Desired current balance (for reconciliation)")


class AccountResponse(AccountBase):
    """Schema for account response."""

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccountWithBalanceResponse(AccountResponse):
    """Schema for account response with calculated balance."""

    current_balance: int = Field(..., description="Current balance calculated from initial + transactions")
    transaction_count: int = Field(default=0, description="Number of transactions for this account")

    class Config:
        from_attributes = True
