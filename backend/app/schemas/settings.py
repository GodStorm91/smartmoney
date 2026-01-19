"""Settings schemas for API validation."""
from pydantic import BaseModel, Field


class SettingsUpdate(BaseModel):
    """Schema for updating app settings."""

    currency: str | None = Field(None, pattern="^(JPY|USD|VND)$", description="Currency code (JPY, USD, or VND)")
    base_date: int | None = Field(None, ge=1, le=31, description="Base date for monthly calculations (1-31)")
    budget_carry_over: bool | None = Field(None, description="Carry over unused budget to next month")
    budget_email_alerts: bool | None = Field(None, description="Send email alerts for budget thresholds")


class SettingsResponse(BaseModel):
    """Schema for app settings."""

    currency: str = "JPY"
    base_date: int = 25
    budget_carry_over: bool = False
    budget_email_alerts: bool = True
    categories: list[str]
    sources: list[str]
