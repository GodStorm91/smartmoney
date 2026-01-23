"""Budget alert schemas for API validation."""

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class BudgetAlertCreate(BaseModel):
    """Schema for creating a budget alert."""

    user_id: int
    budget_id: int
    category: str | None = None
    alert_type: str = Field(
        ..., pattern="^(warning|over_budget|threshold_50|threshold_80|threshold_100)$"
    )
    threshold_percentage: Decimal = Field(..., ge=0, le=200)
    current_spending: int = Field(..., ge=0)
    budget_amount: int = Field(..., ge=0)
    amount_remaining: int | None = None


class BudgetAlertResponse(BaseModel):
    """Budget alert response."""

    id: int
    budget_id: int
    category: str | None = None
    alert_type: str
    threshold_percentage: Decimal
    current_spending: int
    budget_amount: int
    amount_remaining: int | None = None
    is_read: bool
    is_dismissed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BudgetAlertListResponse(BaseModel):
    """Response for list of budget alerts."""

    success: bool = True
    data: dict = Field(default_factory=lambda: {"alerts": [], "total_count": 0, "unread_count": 0})
    alerts: list[BudgetAlertResponse]
    total_count: int
    unread_count: int


class ThresholdStatus(BaseModel):
    """Status of a single threshold."""

    threshold_amount: int
    is_exceeded: bool
    exceeded_at: datetime | None = None


class CategoryThresholdStatus(BaseModel):
    """Threshold status for a category."""

    category: str
    budget_amount: int
    spent: int
    percentage: float
    status: str  # "normal", "threshold_50", "threshold_80", "threshold_100", "over_budget"


class BudgetThresholdStatusResponse(BaseModel):
    """Response for budget threshold status."""

    budget_id: int
    month_key: str
    total_budget: int
    total_spent: int
    percentage_used: float
    is_over_budget: bool
    thresholds: dict = Field(default_factory=dict)
    category_status: list[CategoryThresholdStatus]

    class Config:
        from_attributes = True


class MarkAlertReadRequest(BaseModel):
    """Request to mark alert as read."""

    pass


class MarkAllAlertsReadResponse(BaseModel):
    """Response for marking all alerts as read."""

    success: bool = True
    updated_count: int
