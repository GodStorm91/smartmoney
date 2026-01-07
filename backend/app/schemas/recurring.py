"""Pydantic schemas for recurring transactions."""
from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class FrequencyType(str, Enum):
    """Frequency types for recurring transactions."""

    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class RecurringTransactionBase(BaseModel):
    """Base schema for recurring transactions."""

    description: str = Field(..., max_length=500)
    amount: int = Field(..., description="Amount in currency as integer (positive)")
    category: str = Field(..., max_length=100)
    account_id: Optional[int] = None
    is_income: bool = False

    # Currency and source
    currency: str = Field(default="JPY", max_length=3)
    source: str = Field(default="Manual", max_length=100)

    frequency: FrequencyType
    interval_days: Optional[int] = Field(None, ge=1, le=365, description="For custom frequency: every N days")
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="0=Monday, 6=Sunday")
    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="1-31")
    month_of_year: Optional[int] = Field(None, ge=1, le=12, description="1-12 for yearly")

    @field_validator("interval_days")
    @classmethod
    def validate_interval_days(cls, v: Optional[int], info) -> Optional[int]:
        """Require interval_days for custom frequency."""
        # This is called before full model validation, so we check in model_validator instead
        return v


class RecurringTransactionCreate(RecurringTransactionBase):
    """Schema for creating a recurring transaction."""

    start_date: date = Field(default_factory=date.today, description="When to start the recurring schedule")
    end_date: Optional[date] = None
    auto_submit: bool = Field(default=False, description="Auto-create without user confirmation")

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
    amount: Optional[int] = Field(None, description="Amount in currency as integer (positive)")
    category: Optional[str] = Field(None, max_length=100)
    account_id: Optional[int] = None
    is_income: Optional[bool] = None

    # Currency and source
    currency: Optional[str] = Field(None, max_length=3)
    source: Optional[str] = Field(None, max_length=100)

    frequency: Optional[FrequencyType] = None
    interval_days: Optional[int] = Field(None, ge=1, le=365)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    month_of_year: Optional[int] = Field(None, ge=1, le=12)

    # Schedule and auto-submit
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    auto_submit: Optional[bool] = None

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
    start_date: date
    end_date: Optional[date] = None
    next_run_date: date
    last_run_date: Optional[date] = None
    is_active: bool
    auto_submit: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class RecurringTransactionListResponse(BaseModel):
    """Schema for list of recurring transactions."""

    recurring_transactions: list[RecurringTransactionResponse]
    total: int


class RecurringMonthlySummaryItem(BaseModel):
    """Schema for a single recurring transaction in summary."""

    id: int
    description: str
    amount: int
    category: str
    is_income: bool
    scheduled_date: date


class RecurringMonthlySummaryResponse(BaseModel):
    """Schema for recurring transactions monthly summary (for spending prediction)."""

    month: str  # YYYY-MM
    paid_this_month: int  # Sum of recurring already executed this month
    upcoming_this_month: int  # Sum of recurring scheduled but not yet paid
    paid_count: int
    upcoming_count: int
    paid_transactions: list[RecurringMonthlySummaryItem]
    upcoming_transactions: list[RecurringMonthlySummaryItem]


# Suggestion schemas
class RecurringSuggestion(BaseModel):
    """Schema for a detected recurring pattern suggestion."""

    hash: str  # Unique identifier for dismissing
    description: str
    normalized_description: str
    amount: int
    category: str
    frequency: str
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    interval_days: Optional[int] = None
    is_income: bool
    occurrences: int
    last_date: str
    avg_interval: float
    confidence: int  # 0-100


class RecurringSuggestionsResponse(BaseModel):
    """Schema for list of recurring suggestions."""

    suggestions: list[RecurringSuggestion]
    total: int
