"""Goal schemas for API validation."""
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class GoalBase(BaseModel):
    """Base goal schema."""

    years: int = Field(..., ge=1, le=10, description="Goal horizon in years (1, 3, 5, or 10)")
    target_amount: int = Field(..., gt=0, description="Target amount in JPY")
    start_date: Optional[date] = None


class GoalCreate(GoalBase):
    """Schema for creating a goal."""

    pass


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""

    target_amount: Optional[int] = Field(None, gt=0)
    start_date: Optional[date] = None


class GoalResponse(GoalBase):
    """Schema for goal response."""

    id: int

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
    data_source: str  # e.g., "2025-10"
    months_remaining: int


class GoalProgressResponse(BaseModel):
    """Schema for goal progress data."""

    goal_id: int
    years: int
    target_amount: int
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
    achievability: Optional[GoalAchievabilityResponse] = None
