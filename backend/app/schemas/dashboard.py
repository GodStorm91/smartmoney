"""Dashboard schemas for API validation."""
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    """Schema for dashboard summary KPIs."""

    income: int
    expense: int
    net: int
    income_change: float
    expense_change: float
    net_change: float
