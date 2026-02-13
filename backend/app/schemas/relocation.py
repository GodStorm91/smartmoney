"""Schemas for relocation financial comparison API."""
from enum import Enum

from pydantic import BaseModel, Field


class FamilySize(str, Enum):
    """Family size options for tax/dependent calculation."""

    single = "single"
    couple = "couple"
    couple_1 = "couple_1"
    couple_2 = "couple_2"
    couple_3 = "couple_3"


class RoomType(str, Enum):
    """Room type options for rent lookup."""

    one_k = "1K"
    one_ldk = "1LDK"
    two_ldk = "2LDK"
    three_ldk = "3LDK"


class RelocationCompareRequest(BaseModel):
    """Request body for city comparison."""

    nenshu: int = Field(..., gt=0, description="Annual income in JPY")
    family_size: FamilySize
    room_type: RoomType
    current_city_id: int = Field(..., gt=0)
    target_city_id: int = Field(..., gt=0)
    has_young_children: bool = False


class CityBreakdown(BaseModel):
    """Monthly cost breakdown for a single city."""

    city_name: str
    prefecture_name: str
    rent: int
    estimated_food: int
    estimated_utilities: int
    estimated_transport: int
    social_insurance: int
    resident_tax: int
    income_tax: int
    estimated_childcare: int
    total_monthly: int


class RelocationCompareResponse(BaseModel):
    """Response body for city comparison."""

    current: CityBreakdown
    target: CityBreakdown
    monthly_difference: int
    annual_difference: int
    advice: list[str] = []


class CityListItem(BaseModel):
    """Single city entry for the cities list endpoint."""

    id: int
    city_name: str
    city_name_en: str
    prefecture_name: str
    prefecture_name_en: str

    class Config:
        from_attributes = True


class PostalCodeResponse(BaseModel):
    """Response for postal code resolution."""

    city_id: int | None = None
    prefecture_name: str | None = None
    city_name: str | None = None
    matched: bool = False
    error: str | None = None
