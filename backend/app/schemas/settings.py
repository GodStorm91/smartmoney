"""Settings schemas for API validation."""
from pydantic import BaseModel


class SettingsResponse(BaseModel):
    """Schema for app settings."""

    currency: str = "JPY"
    base_date: int = 25
    categories: list[str]
    sources: list[str]
