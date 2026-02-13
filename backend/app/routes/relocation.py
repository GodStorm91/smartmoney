"""Relocation financial comparison API routes."""
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.relocation import (
    CityListItem,
    PostalCodeResponse,
    RelocationCompareRequest,
    RelocationCompareResponse,
)
from ..services.relocation_service import get_relocation_service

router = APIRouter(prefix="/api/relocation", tags=["relocation"])


@router.get("/cities", response_model=list[CityListItem])
async def list_cities(db: Session = Depends(get_db)):
    """List all available cities for relocation comparison."""
    service = get_relocation_service()
    return service.get_cities(db)


@router.post("/compare", response_model=RelocationCompareResponse)
async def compare_cities(
    req: RelocationCompareRequest,
    db: Session = Depends(get_db),
):
    """Compare monthly living costs between two cities.

    Calculates tax, rent, and living-cost breakdowns for
    both cities and returns the difference.
    """
    service = get_relocation_service()
    try:
        return service.compare_cities(db, req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/resolve-postal", response_model=PostalCodeResponse)
async def resolve_postal(
    code: str = Query(..., description="7-digit Japanese postal code"),
    db: Session = Depends(get_db),
):
    """Resolve a Japanese postal code to a city in our database."""
    if not re.fullmatch(r"\d{7}", code):
        raise HTTPException(
            status_code=400,
            detail="Postal code must be exactly 7 digits",
        )
    service = get_relocation_service()
    return service.resolve_postal_code(db, code)
