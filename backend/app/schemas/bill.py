"""Bill reminder schemas for API validation."""

from datetime import date, datetime, time
from typing import Any
from pydantic import BaseModel, Field, field_validator


class BillCreate(BaseModel):
    """Schema for creating a bill."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    amount: int = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=100)
    color: str | None = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    due_day: int = Field(..., ge=1, le=31)
    due_time: time | None = None
    is_recurring: bool = True
    recurrence_type: str = Field(
        default="monthly", pattern="^(weekly|biweekly|monthly|quarterly|yearly|custom)$"
    )
    recurrence_config: dict[str, Any] | None = None
    next_due_date: date
    last_paid_date: date | None = None
    reminder_days_before: int = Field(default=3, ge=1, le=7)
    reminder_enabled: bool = True
    recurring_transaction_id: int | None = None
    sync_with_recurring: bool = True

    @field_validator("next_due_date")
    @classmethod
    def validate_next_due_date(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("next_due_date cannot be in the past")
        return v


class BillUpdate(BaseModel):
    """Schema for updating a bill."""

    name: str | None = None
    description: str | None = None
    amount: int | None = Field(None, gt=0)
    category: str | None = None
    color: str | None = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    due_day: int | None = Field(None, ge=1, le=31)
    due_time: time | None = None
    is_recurring: bool | None = None
    recurrence_type: str | None = Field(
        None, pattern="^(weekly|biweekly|monthly|quarterly|yearly|custom)$"
    )
    recurrence_config: dict[str, Any] | None = None
    next_due_date: date | None = None
    last_paid_date: date | None = None
    reminder_days_before: int | None = Field(None, ge=1, le=7)
    reminder_enabled: bool | None = None
    sync_with_recurring: bool | None = None


class BillHistoryResponse(BaseModel):
    """Bill payment history response."""

    id: int
    bill_id: int
    paid_date: date
    amount_paid: int
    notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class BillResponse(BaseModel):
    """Bill response."""

    id: int
    user_id: int
    name: str
    description: str | None = None
    amount: int
    category: str
    color: str | None = None
    due_day: int
    due_time: time | None = None
    is_recurring: bool
    recurrence_type: str
    recurrence_config: dict[str, Any] | None = None
    next_due_date: date
    last_paid_date: date | None = None
    reminder_days_before: int
    reminder_enabled: bool
    last_reminder_sent: datetime | None = None
    is_paid: bool
    paid_amount: int | None = None
    recurring_transaction_id: int | None = None
    sync_with_recurring: bool
    last_synced_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class BillListResponse(BaseModel):
    """Response for list of bills."""

    success: bool = True
    bills: list[BillResponse]
    total_count: int


class BillCalendarDay(BaseModel):
    """Single day in calendar view."""

    day: int
    bills: list[BillResponse]


class BillCalendarResponse(BaseModel):
    """Response for bill calendar view."""

    success: bool = True
    year: int
    month: int
    days: list[BillCalendarDay]
    total_bills_due: int
    total_amount_due: int


class UpcomingBillResponse(BaseModel):
    """Upcoming bill response."""

    id: int
    name: str
    amount: int
    due_date: date
    days_until_due: int
    category: str
    reminder_enabled: bool
    reminder_days_before: int


class UpcomingBillsResponse(BaseModel):
    """Response for upcoming bills."""

    success: bool = True
    upcoming_bills: list[UpcomingBillResponse]
    total_count: int
    total_amount: int


class MarkBillPaidRequest(BaseModel):
    """Request to mark bill as paid."""

    paid_date: date | None = None
    amount_paid: int | None = None
    notes: str | None = None


class MarkBillPaidResponse(BaseModel):
    """Response for marking bill as paid."""

    success: bool = True
    id: int
    is_paid: bool
    paid_date: date
    next_due_date: date
    history_id: int


class BillDetailResponse(BaseModel):
    """Bill detail with history response."""

    success: bool = True
    bill: BillResponse
    history: list[BillHistoryResponse]


class BillDeleteResponse(BaseModel):
    """Response for deleting a bill."""

    success: bool = True
    message: str = "Bill deleted successfully"


# === Reminder Schedule Schemas ===


class ReminderScheduleCreate(BaseModel):
    """Schema for creating a reminder schedule."""

    reminder_type: str = Field(
        default="days_before", pattern="^(days_before|specific_date|recurring)$"
    )
    days_before: int | None = Field(None, ge=1, le=14)
    reminder_time: time | None = Field(None, description="Time of day for reminder (HH:MM)")
    recurrence_config: dict[str, Any] | None = None


class ReminderScheduleResponse(BaseModel):
    """Reminder schedule response."""

    id: int
    bill_id: int
    reminder_type: str
    days_before: int | None
    reminder_time: datetime
    is_sent: bool
    sent_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ReminderScheduleListResponse(BaseModel):
    """Response for list of reminder schedules."""

    success: bool = True
    schedules: list[ReminderScheduleResponse]


class ReminderScheduleDeleteResponse(BaseModel):
    """Response for deleting a reminder schedule."""

    success: bool = True
    message: str = "Reminder schedule deleted successfully"


# === Partial Payment Schemas ===


class PartialPaymentStatusResponse(BaseModel):
    """Partial payment status response."""

    success: bool = True
    bill_id: int
    total_amount: int
    paid_amount: int
    remaining_amount: int
    is_fully_paid: bool
    has_partial_payment: bool
