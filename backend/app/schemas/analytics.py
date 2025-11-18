"""Analytics schemas for API validation."""
from pydantic import BaseModel


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


class AnalyticsResponse(BaseModel):
    """Comprehensive analytics response with all data."""

    monthly_trends: list[MonthlyCashflowResponse]
    category_breakdown: list[CategoryBreakdownResponse]
    total_income: int
    total_expense: int
    net_cashflow: int
