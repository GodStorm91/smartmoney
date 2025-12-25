"""Goal schemas for API validation."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from ..models.goal_type import GoalType


class GoalBase(BaseModel):
    """Base goal schema."""

    goal_type: GoalType = Field(default=GoalType.CUSTOM)
    name: Optional[str] = Field(None, max_length=100)
    years: int = Field(..., ge=1, le=10, description="Goal horizon in years (1-10)")
    target_amount: int = Field(..., gt=0, description="Target amount")
    currency: str = Field(default="JPY", pattern="^(JPY|USD|VND)$", description="Currency code")
    start_date: Optional[date] = None
    account_id: Optional[int] = None


class GoalCreate(GoalBase):
    """Schema for creating a goal."""

    pass


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""

    name: Optional[str] = Field(None, max_length=100)
    target_amount: Optional[int] = Field(None, gt=0)
    start_date: Optional[date] = None
    account_id: Optional[int] = None
    priority: Optional[int] = Field(None, ge=1)


class GoalResponse(BaseModel):
    """Schema for goal response."""

    id: int
    goal_type: str
    name: Optional[str] = None
    years: int
    target_amount: int
    currency: str = "JPY"
    start_date: Optional[date] = None
    priority: int = 0
    account_id: Optional[int] = None
    ai_advice: Optional[str] = None
    milestone_25_at: Optional[datetime] = None
    milestone_50_at: Optional[datetime] = None
    milestone_75_at: Optional[datetime] = None
    milestone_100_at: Optional[datetime] = None
    # Linked account info (populated by service)
    account_name: Optional[str] = None
    account_balance: Optional[int] = None

    class Config:
        from_attributes = True


class GoalAchievabilityResponse(BaseModel):
    """Schema for goal achievability metrics."""

    current_monthly_net: int
    achievable_amount: int
    achievable_percentage: float
    required_monthly: int
    monthly_gap: int
    status_tier: str  # on_track, achievable, challenging, deficit, severe_deficit
    recommendation: str
    data_source: str  # e.g., "2025-08 to 2025-10 (3 months avg)"
    months_remaining: int
    trend_months_requested: int  # Number of months requested for rolling average
    trend_months_actual: int  # Actual months used (may be less than requested)


class GoalProgressResponse(BaseModel):
    """Schema for goal progress data."""

    goal_id: int
    goal_type: str = "custom"
    name: Optional[str] = None
    years: int
    target_amount: int
    currency: str = "JPY"
    start_date: str
    target_date: str
    current_date: str
    total_saved: int
    progress_percentage: float
    months_total: int
    months_elapsed: int
    months_remaining: int
    avg_monthly_net: int
    needed_per_month: int
    needed_remaining: int
    projected_total: int
    status: str
    priority: int = 0
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    milestone_25_at: Optional[datetime] = None
    milestone_50_at: Optional[datetime] = None
    milestone_75_at: Optional[datetime] = None
    milestone_100_at: Optional[datetime] = None
    achievability: Optional[GoalAchievabilityResponse] = None


class GoalReorderRequest(BaseModel):
    """Schema for reordering goals."""

    goal_ids: list[int] = Field(..., description="Ordered list of goal IDs")


class GoalTemplateResponse(BaseModel):
    """Schema for goal template with AI suggestions."""

    goal_type: str
    suggested_target: int
    suggested_years: int
    monthly_required: int
    achievable: bool
    advice: str
