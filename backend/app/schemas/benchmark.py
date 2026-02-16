"""Benchmark-related Pydantic schemas."""

from pydantic import BaseModel, Field


class HouseholdProfile(BaseModel):
    """Household profile for benchmark comparison."""

    household_size: int = Field(ge=1, le=5, description="Household size (1-5)")
    prefecture_code: str = Field(min_length=2, max_length=2, description="Prefecture code (01-47)")
    income_quintile: int = Field(ge=1, le=5, description="Income quintile (1=lowest, 5=highest)")


class HouseholdProfileUpdate(BaseModel):
    """Update household profile."""

    household_size: int | None = Field(None, ge=1, le=5)
    prefecture_code: str | None = Field(None, min_length=2, max_length=2)
    income_quintile: int | None = Field(None, ge=1, le=5)


class CategoryComparison(BaseModel):
    """Single category comparison."""

    category: str
    user_amount: int = Field(description="User's 3-month average in JPY")
    benchmark_amount: int = Field(description="National benchmark amount in JPY")
    difference_pct: float = Field(description="Percentage difference")
    status: str = Field(description="over, under, or neutral")


class BenchmarkComparison(BaseModel):
    """Full benchmark comparison response."""

    user_profile: HouseholdProfile
    comparisons: list[CategoryComparison]
    total_user_spending: int
    total_benchmark_spending: int
    overall_difference_pct: float


class NationalAverage(BaseModel):
    """National average spending data."""

    category: str
    subcategory: str | None
    monthly_amount: int
    household_size: int | None
    prefecture_code: str | None
    income_quintile: int | None
    source: str
    data_year: int
