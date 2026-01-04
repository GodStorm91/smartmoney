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


class AllocationUpdateRequest(BaseModel):
    """Request to update a single allocation amount."""
    amount: int = Field(..., ge=0)


class BudgetResponse(BaseModel):
    """Budget response."""
    id: int
    month: str
    monthly_income: int
    savings_target: int | None = None
    advice: str | None = None
    language: str = "ja"  # Language used for AI advice
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


class BudgetAllocationSuggestion(BaseModel):
    """Allocation suggestion from previous budget."""
    category: str
    amount: int


class BudgetSuggestionsResponse(BaseModel):
    """Budget suggestions based on previous month."""
    has_previous: bool
    previous_month: str | None = None
    previous_income: int | None = None
    previous_allocations: list[BudgetAllocationSuggestion] | None = None
    carry_over: int = 0
