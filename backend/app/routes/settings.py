"""Settings API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.settings import SettingsResponse, SettingsUpdate
from ..services.settings_service import SettingsService

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get app settings with categories and sources from database.

    Returns:
        Settings with currency, base_date, categories, and sources
    """
    return SettingsService.get_settings(db=db, user_id=current_user.id)


@router.put("", response_model=SettingsResponse)
async def update_settings(
    settings_update: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update app settings.

    Args:
        settings_update: Settings fields to update
        db: Database session

    Returns:
        Updated settings

    Raises:
        HTTPException: If settings not initialized
    """
    try:
        return SettingsService.update_settings(
            db=db,
            user_id=current_user.id,
            updates=settings_update.model_dump(exclude_unset=True)
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/categories", response_model=list[str])
async def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get unique categories from transactions.

    Returns:
        List of unique category names
    """
    return SettingsService.get_categories(db=db, user_id=current_user.id)


@router.get("/sources", response_model=list[str])
async def get_sources(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get unique sources from transactions.

    Returns:
        List of unique source names
    """
    return SettingsService.get_sources(db=db, user_id=current_user.id)
