"""Settings API routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.settings import SettingsResponse
from ..services.settings_service import SettingsService

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    """Get app settings with categories and sources from database.

    Returns:
        Settings with currency, base_date, categories, and sources
    """
    return SettingsService.get_settings(db=db)


@router.get("/categories", response_model=list[str])
async def get_categories(db: Session = Depends(get_db)):
    """Get unique categories from transactions.

    Returns:
        List of unique category names
    """
    return SettingsService.get_categories(db=db)


@router.get("/sources", response_model=list[str])
async def get_sources(db: Session = Depends(get_db)):
    """Get unique sources from transactions.

    Returns:
        List of unique source names
    """
    return SettingsService.get_sources(db=db)
