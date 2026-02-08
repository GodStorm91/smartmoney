"""Monthly usage report schemas for API validation."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReportSummary(BaseModel):
    """Monthly financial summary with MoM comparison."""

    total_income: int
    total_expense: int
    net_cashflow: int
    savings_rate: float = Field(description="% of income saved")
    income_change: float = Field(description="% change vs prev month")
    expense_change: float = Field(description="% change vs prev month")
    net_change: float = Field(description="% change vs prev month")


class BudgetCategoryStatus(BaseModel):
    """Budget status for a single category."""

    category: str
    budget_amount: int
    spent: int
    percentage: float = Field(description="% of budget used")
    status: str  # normal, threshold_50, threshold_80, over_budget


class BudgetAdherence(BaseModel):
    """Overall budget adherence for the month."""

    total_budget: int
    total_spent: int
    percentage_used: float
    is_over_budget: bool
    category_status: list[BudgetCategoryStatus]


class GoalProgressItem(BaseModel):
    """Progress for a single financial goal."""

    goal_id: int
    years: int
    target_amount: int
    total_saved: int
    progress_percentage: float
    needed_per_month: int
    status: str  # ahead, on_track, behind


class AccountSummaryItem(BaseModel):
    """Summary for a single account."""

    account_id: int
    account_name: str
    account_type: str
    balance: int
    currency: str


class ReportInsight(BaseModel):
    """Single insight item for the report."""

    type: str
    severity: str
    title: str
    message: str
    category: Optional[str] = None
    amount: Optional[int] = None
    percentage_change: Optional[float] = None


class MonthlyUsageReportData(BaseModel):
    """Complete monthly usage report data."""

    year: int
    month: int
    month_label: str = Field(description="Display label e.g. 'January 2026'")
    generated_at: datetime
    summary: ReportSummary
    budget_adherence: Optional[BudgetAdherence] = None
    category_breakdown: list[dict]
    spending_trends: list[dict]
    goal_progress: list[GoalProgressItem]
    account_summary: list[AccountSummaryItem]
    insights: list[ReportInsight]
    total_net_worth: int = Field(description="Sum of all account balances in JPY")
