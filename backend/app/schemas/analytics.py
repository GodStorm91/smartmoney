"""Analytics schemas for API validation."""
from typing import Optional
from pydantic import BaseModel


class SpendingInsight(BaseModel):
    """Single spending insight."""

    type: str  # 'spike', 'trend', 'unusual', 'budget', 'saving'
    severity: str  # 'info', 'warning', 'success'
    title: str
    message: str
    category: Optional[str] = None
    amount: Optional[int] = None
    percentage_change: Optional[float] = None


class SpendingInsightsResponse(BaseModel):
    """Collection of spending insights."""

    insights: list[SpendingInsight]
    generated_at: str


class MonthlyCashflowResponse(BaseModel):
    """Schema for monthly cashflow data."""

    month: str
    income: int
    expenses: int
    net: int


class CategoryBreakdownResponse(BaseModel):
    """Schema for category breakdown data."""

    category: str
    amount: int
    count: int


class SourceBreakdownResponse(BaseModel):
    """Schema for source breakdown data."""

    source: str
    total: int
    count: int


class ComparisonData(BaseModel):
    """Comparison data vs previous period."""

    income_change: Optional[float] = None
    expense_change: Optional[float] = None
    net_change: Optional[float] = None


class TopCategory(BaseModel):
    """Top spending category."""

    name: str
    amount: int
    percentage: float


class AnalyticsResponse(BaseModel):
    """Comprehensive analytics response with all data."""

    monthly_trends: list[MonthlyCashflowResponse]
    category_breakdown: list[CategoryBreakdownResponse]
    total_income: int
    total_expense: int
    net_cashflow: int
    comparison: Optional[ComparisonData] = None
    top_category: Optional[TopCategory] = None
