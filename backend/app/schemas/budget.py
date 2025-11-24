"""Budget schemas for API validation."""
from datetime import datetime
from pydantic import BaseModel, Field


class BudgetAllocationSchema(BaseModel):
    """Budget allocation response."""
    category: str
    amount: int
    reasoning: str | None = None


class BudgetGenerateRequest(BaseModel):
    """Request to generate budget."""
    monthly_income: int = Field(..., gt=0)
    feedback: str | None = None
    language: str = Field(default="ja", pattern="^(ja|en|vi)$")


class BudgetRegenerateRequest(BaseModel):
    """Request to regenerate budget with feedback."""
    feedback: str = Field(..., min_length=1)
    language: str = Field(default="ja", pattern="^(ja|en|vi)$")


class BudgetResponse(BaseModel):
    """Budget response."""
    id: int
    month: str
    monthly_income: int
    savings_target: int | None = None
    advice: str | None = None
    allocations: list[BudgetAllocationSchema]
    created_at: datetime

    class Config:
        from_attributes = True


class BudgetTrackingItem(BaseModel):
    """Single category tracking item."""
    category: str
    budgeted: int
    spent: int
    remaining: int
    percentage: float
    status: str  # green, yellow, orange, red


class BudgetTrackingResponse(BaseModel):
    """Budget tracking response."""
    month: str
    monthly_income: int
    days_remaining: int
    safe_to_spend_today: int
    total_budgeted: int
    total_spent: int
    savings_target: int | None = None
    categories: list[BudgetTrackingItem]
