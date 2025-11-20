"""Settings schemas for API validation."""
from pydantic import BaseModel, Field


class SettingsUpdate(BaseModel):
    """Schema for updating app settings."""

    currency: str | None = Field(None, pattern="^(JPY|USD|VND)$", description="Currency code (JPY, USD, or VND)")
    base_date: int | None = Field(None, ge=1, le=31, description="Base date for monthly calculations (1-31)")


class SettingsResponse(BaseModel):
    """Schema for app settings."""

    currency: str = "JPY"
    base_date: int = 25
    categories: list[str]
    sources: list[str]
