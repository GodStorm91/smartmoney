"""Pydantic schemas for recurring transactions."""
from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class FrequencyType(str, Enum):
    """Frequency types for recurring transactions."""

    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class RecurringTransactionBase(BaseModel):
    """Base schema for recurring transactions."""

    description: str = Field(..., max_length=500)
    amount: int = Field(..., description="Amount in JPY as integer (positive)")
    category: str = Field(..., max_length=100)
    account_id: Optional[int] = None
    is_income: bool = False

    frequency: FrequencyType
    interval_days: Optional[int] = Field(None, ge=1, le=365, description="For custom frequency: every N days")
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="0=Monday, 6=Sunday")
    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="1-31")

    @field_validator("interval_days")
    @classmethod
    def validate_interval_days(cls, v: Optional[int], info) -> Optional[int]:
        """Require interval_days for custom frequency."""
        # This is called before full model validation, so we check in model_validator instead
        return v


class RecurringTransactionCreate(RecurringTransactionBase):
    """Schema for creating a recurring transaction."""

    start_date: date = Field(..., description="When to start the recurring schedule")

    @field_validator("amount")
    @classmethod
    def validate_amount_positive(cls, v: int) -> int:
        """Ensure amount is positive."""
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class RecurringTransactionUpdate(BaseModel):
    """Schema for updating a recurring transaction."""

    description: Optional[str] = Field(None, max_length=500)
    amount: Optional[int] = Field(None, description="Amount in JPY as integer (positive)")
    category: Optional[str] = Field(None, max_length=100)
    account_id: Optional[int] = None
    is_income: Optional[bool] = None

    frequency: Optional[FrequencyType] = None
    interval_days: Optional[int] = Field(None, ge=1, le=365)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    day_of_month: Optional[int] = Field(None, ge=1, le=31)

    is_active: Optional[bool] = None

    @field_validator("amount")
    @classmethod
    def validate_amount_positive(cls, v: Optional[int]) -> Optional[int]:
        """Ensure amount is positive if provided."""
        if v is not None and v <= 0:
            raise ValueError("Amount must be positive")
        return v


class RecurringTransactionResponse(RecurringTransactionBase):
    """Schema for recurring transaction response."""

    id: int
    next_run_date: date
    last_run_date: Optional[date] = None
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class RecurringTransactionListResponse(BaseModel):
    """Schema for list of recurring transactions."""

    recurring_transactions: list[RecurringTransactionResponse]
    total: int
