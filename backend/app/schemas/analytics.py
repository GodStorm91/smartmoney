"""Analytics schemas for API validation."""
from typing import Optional
from pydantic import BaseModel, Field


class SpendingInsight(BaseModel):
    """Single spending insight."""

    type: str = Field(..., description="Insight type: spike, trend, unusual, budget, saving")
    severity: str = Field(..., description="Severity level: info, warning, success")
    title: str = Field(..., description="Short insight title")
    message: str = Field(..., description="Detailed insight message")
    category: Optional[str] = Field(None, description="Related category name")
    amount: Optional[int] = Field(None, description="Related amount (JPY)")
    percentage_change: Optional[float] = Field(None, description="Percentage change value")


class SpendingInsightsResponse(BaseModel):
    """Collection of spending insights."""

    insights: list[SpendingInsight] = Field(default_factory=list, description="List of spending insights")
    generated_at: str = Field(..., description="ISO timestamp when insights were generated")


class MonthlyCashflowResponse(BaseModel):
    """Schema for monthly cashflow data."""

    month: str = Field(..., description="Month in YYYY-MM format")
    income: int = Field(default=0, description="Total income for the month (JPY)")
    expenses: int = Field(default=0, description="Total expenses for the month (JPY)")
    net: int = Field(default=0, description="Net cashflow (income - expenses)")


class CategoryBreakdownResponse(BaseModel):
    """Schema for category breakdown data."""

    category: str = Field(..., description="Category name")
    amount: int = Field(default=0, description="Total amount for category (JPY)")
    count: int = Field(default=0, description="Number of transactions")


class SourceBreakdownResponse(BaseModel):
    """Schema for source breakdown data."""

    source: str = Field(..., description="Data source name")
    total: int = Field(default=0, description="Total amount from source (JPY)")
    count: int = Field(default=0, description="Number of transactions from source")


class AnalyticsResponse(BaseModel):
    """Comprehensive analytics response with all data."""

    monthly_trends: list[MonthlyCashflowResponse] = Field(default_factory=list, description="Monthly cashflow trends")
    category_breakdown: list[CategoryBreakdownResponse] = Field(default_factory=list, description="Expense breakdown by category")
    total_income: int = Field(default=0, description="Total income across all months (JPY)")
    total_expense: int = Field(default=0, description="Total expenses across all months (JPY)")
    net_cashflow: int = Field(default=0, description="Net cashflow across all months (JPY)")
