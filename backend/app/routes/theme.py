"""Theme settings routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.theme import ThemeSettings, ThemeSettingsUpdate

router = APIRouter(prefix="/api/user/theme-settings", tags=["theme"])


@router.get("", response_model=ThemeSettings)
async def get_theme_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's theme settings."""
    if current_user.theme_settings:
        return ThemeSettings(**current_user.theme_settings)

    # Return default theme settings if not set
    return ThemeSettings()


@router.put("", response_model=ThemeSettings)
async def update_theme_settings(
    settings: ThemeSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's theme settings."""
    # Get existing settings or use defaults
    current_settings = current_user.theme_settings.copy() if current_user.theme_settings else {}

    # Update only provided fields
    update_data = settings.model_dump(exclude_unset=True)
    current_settings.update(update_data)

    # Save to database (reassign to trigger SQLAlchemy change detection)
    current_user.theme_settings = current_settings
    db.commit()
    db.refresh(current_user)

    return ThemeSettings(**current_user.theme_settings)
