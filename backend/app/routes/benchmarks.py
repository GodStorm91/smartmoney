"""Benchmark comparison routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.benchmark import (
    BenchmarkComparison,
    HouseholdProfile,
    HouseholdProfileUpdate,
    NationalAverage,
)
from ..services.benchmark_service import BenchmarkService

router = APIRouter(prefix="/api", tags=["benchmarks"])


@router.get("/user/household-profile", response_model=HouseholdProfile | None)
async def get_household_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's household profile."""
    return BenchmarkService.get_household_profile(db, current_user.id)


@router.put("/user/household-profile", response_model=HouseholdProfile)
async def update_household_profile(
    profile: HouseholdProfile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's household profile."""
    return BenchmarkService.update_household_profile(db, current_user.id, profile)


@router.get("/benchmarks/comparison", response_model=BenchmarkComparison)
async def get_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get spending comparison vs national benchmarks.

    Compares user's last 3 months average spending against matched benchmarks.
    Requires household profile to be set first.
    """
    try:
        return BenchmarkService.get_comparison(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/benchmarks/national-averages", response_model=list[NationalAverage])
async def get_national_averages(
    prefecture_code: str | None = Query(None, min_length=2, max_length=2),
    household_size: int | None = Query(None, ge=1, le=5),
    income_quintile: int | None = Query(None, ge=1, le=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get national average spending data with optional filters."""
    return BenchmarkService.get_national_averages(
        db,
        prefecture_code=prefecture_code,
        household_size=household_size,
        income_quintile=income_quintile,
    )
