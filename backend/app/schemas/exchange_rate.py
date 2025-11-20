"""Exchange rate schemas for API validation."""
from pydantic import BaseModel, Field


class ExchangeRatesResponse(BaseModel):
    """Schema for exchange rates API response."""

    rates: dict[str, float] = Field(
        ...,
        description="Currency codes to exchange rates (to JPY base)",
        example={"JPY": 1.0, "USD": 0.00667, "VND": 160.0},
    )
    updated_at: str | None = Field(
        None,
        description="Timestamp of last rate update (ISO 8601)",
        example="2025-11-19T04:00:00Z",
    )
    base_currency: str = Field(
        default="JPY", description="Base currency for all rates", example="JPY"
    )
