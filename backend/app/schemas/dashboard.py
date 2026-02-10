"""Dashboard schemas for API validation."""
from pydantic import BaseModel, Field


class DashboardSummaryResponse(BaseModel):
    """Schema for dashboard summary KPIs."""

    income: int = Field(default=0, description="Total income for the month (JPY)")
    expense: int = Field(default=0, description="Total expenses for the month (JPY)")
    net: int = Field(default=0, description="Net cashflow (income - expense)")
    income_change: float = Field(default=0.0, description="Month-over-month income change (%)")
    expense_change: float = Field(default=0.0, description="Month-over-month expense change (%)")
    net_change: float = Field(default=0.0, description="Month-over-month net change (%)")
