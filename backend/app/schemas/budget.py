"""Budget schemas for API validation."""
from datetime import datetime
from pydantic import BaseModel, Field


class BudgetAllocationSchema(BaseModel):
    """Budget allocation response."""
    category: str = Field(..., description="Budget category name")
    amount: int = Field(default=0, description="Allocated amount (JPY)")
    reasoning: str | None = Field(None, description="AI reasoning for allocation")


class BudgetGenerateRequest(BaseModel):
    """Request to generate budget."""
    monthly_income: int = Field(..., gt=0, description="Monthly income (JPY)")
    feedback: str | None = Field(None, description="User feedback for AI budget generation")
    language: str = Field(default="ja", pattern="^(ja|en|vi)$", description="Language code: ja, en, or vi")


class BudgetRegenerateRequest(BaseModel):
    """Request to regenerate budget with feedback."""
    feedback: str = Field(..., min_length=1, description="User feedback for regeneration")
    language: str = Field(default="ja", pattern="^(ja|en|vi)$", description="Language code: ja, en, or vi")


class AllocationUpdateRequest(BaseModel):
    """Request to update a single allocation amount."""
    amount: int = Field(..., ge=0, description="New allocation amount (JPY)")


class BudgetResponse(BaseModel):
    """Budget response."""
    id: int
    month: str
    monthly_income: int
    savings_target: int | None = None
    advice: str | None = None
    allocations: list[BudgetAllocationSchema]
    created_at: datetime
    version: int = 1
    is_active: bool = True
    copied_from_id: int | None = None

    class Config:
        from_attributes = True


class BudgetCopyRequest(BaseModel):
    """Request to copy budget from one month to another."""
    source_month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Source month (YYYY-MM)")
    target_month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Target month (YYYY-MM)")
    monthly_income: int | None = Field(None, gt=0, description="Override monthly income (optional)")


class BudgetCopyPreview(BaseModel):
    """Preview of budget copy with spending data."""
    source_budget: "BudgetResponse"
    target_month: str
    spending_summary: list["AllocationSpendingSummary"]


class AllocationSpendingSummary(BaseModel):
    """Allocation with spending summary for preview."""
    category: str
    budgeted: int
    spent: int
    remaining: int
    over_budget: bool


class BudgetVersionResponse(BaseModel):
    """Budget version info for history list."""
    id: int
    version: int
    is_active: bool
    created_at: datetime
    monthly_income: int
    total_allocated: int
    copied_from_id: int | None = None

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


# --- Historical Spending Schemas for Predictions ---

class DailySpendingSchema(BaseModel):
    """Daily spending data for a category."""
    date: str  # YYYY-MM-DD
    amount: int  # JPY
    transaction_count: int


class MonthlyTotalSchema(BaseModel):
    """Monthly total spending for a category."""
    month: str  # YYYY-MM
    total: int
    avg_daily: int
    transaction_count: int


class CategoryHistoryResponse(BaseModel):
    """Historical spending data for a category."""
    category: str
    daily_spending: list[DailySpendingSchema]
    monthly_totals: list[MonthlyTotalSchema]
    overall_avg_daily: float
    std_deviation: float
