from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import os
from ..database import get_db
from ..services.rewards_service import RewardsService
from ..auth.dependencies import get_current_user
from ..models.user import User
from ..models.rewards import UnlockableFeature

router = APIRouter(prefix="/api/rewards", tags=["rewards"])


# Themes
@router.get("/themes")
async def get_themes(level: int = 1, db: Session = Depends(get_db)):
    service = RewardsService(db)
    return [
        {
            "id": t.id,
            "code": t.code,
            "name": t.name,
            "description": t.description,
            "type": t.type,
            "preview_color": t.preview_color,
            "icon": t.icon,
            "unlock_level": t.unlock_level,
            "is_premium": t.is_premium,
        }
        for t in service.get_themes(level)
    ]


@router.get("/themes/my")
async def get_my_themes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = RewardsService(db)
    return [
        {"id": t.id, "code": t.code, "name": t.name, "icon": t.icon, "is_active": t.is_active}
        for t in service.get_user_themes(user.id)
    ]


@router.post("/themes/{theme_id}/activate")
async def activate_theme(
    theme_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = RewardsService(db)
    if service.activate_theme(user.id, theme_id):
        return {"message": "Theme activated"}
    raise HTTPException(status_code=400, detail="Cannot activate theme")


# Avatars
@router.get("/avatars")
async def get_avatars(level: int = 1, db: Session = Depends(get_db)):
    service = RewardsService(db)
    return [
        {
            "id": a.id,
            "code": a.code,
            "name": a.name,
            "emoji": a.emoji,
            "image_url": a.image_url,
            "unlock_level": a.unlock_level,
            "rarity": a.rarity,
        }
        for a in service.get_avatars(level)
    ]


@router.get("/avatars/my")
async def get_my_avatars(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = RewardsService(db)
    return [
        {"id": a.id, "code": a.code, "name": a.name, "emoji": a.emoji, "image_url": a.image_url, "rarity": a.rarity}
        for a in service.get_user_avatars(user.id)
    ]


@router.post("/avatars/{avatar_id}/activate")
async def activate_avatar(
    avatar_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = RewardsService(db)
    if service.activate_avatar(user.id, avatar_id):
        return {"message": "Avatar activated"}
    raise HTTPException(status_code=400, detail="Cannot activate avatar")


@router.post("/avatars/upload")
async def upload_custom_avatar(
    avatar: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import logging

    logger = logging.getLogger(__name__)

    logger.info(f"[Avatar Upload] User {user.id} uploading avatar")
    logger.info(f"[Avatar Upload] Filename: {avatar.filename}, Content-Type: {avatar.content_type}")

    service = RewardsService(db)

    # Validate file type (accept HEIC converted files and regular image formats)
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    # Also accept empty or unknown content types (some browsers don't set it properly)
    if avatar.content_type and avatar.content_type not in allowed_types:
        logger.warning(f"[Avatar Upload] Invalid content type: {avatar.content_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only JPG, PNG, GIF, and WebP are allowed. Got: {avatar.content_type}",
        )

    # Validate file size (max 5MB)
    try:
        avatar.file.seek(0, 2)
        file_size = avatar.file.tell()
        avatar.file.seek(0)
        logger.info(f"[Avatar Upload] File size: {file_size} bytes")
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    except Exception as e:
        logger.error(f"[Avatar Upload] Error reading file size: {e}")
        raise HTTPException(status_code=400, detail="Could not read file size")

    # Generate unique filename
    file_ext = os.path.splitext(avatar.filename)[1] if avatar.filename else ".jpg"
    unique_filename = f"avatar_{user.id}_{uuid.uuid4().hex[:8]}{file_ext}"

    # Save file to uploads/avatars directory
    upload_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "avatars"
    )
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as f:
        f.write(await avatar.read())

    # Create custom avatar in database
    new_avatar = service.create_custom_avatar(user.id, unique_filename)

    return {
        "message": "Custom avatar uploaded successfully",
        "avatar": {
            "id": new_avatar.id,
            "code": new_avatar.code,
            "name": "Custom Avatar",
            "emoji": None,
            "rarity": "custom",
        },
    }


# Profile
class ProfileUpdate(BaseModel):
    display_name: str
    bio: Optional[str] = None


@router.get("/profile")
async def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = RewardsService(db)
    profile = service.get_profile(user.id)
    user_gam = service.gamification.get_or_create_user_gamification(user.id)
    return {
        "display_name": profile.display_name if profile else user.email.split("@")[0],
        "bio": profile.bio if profile else None,
        "title": profile.title if profile else None,
        "level": user_gam.calculate_level(),
        "total_xp": user_gam.total_xp,
    }


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = RewardsService(db)
    profile = service.update_profile(user.id, data.display_name, data.bio)
    return {"message": "Profile updated"}


# Features
@router.get("/features")
async def get_features(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = RewardsService(db)
    user_gam = service.gamification.get_or_create_user_gamification(user.id)
    level = user_gam.calculate_level()
    unlocked = service.get_unlocked_features(user.id)
    unlocked_ids = {f.id for f in unlocked}
    return [
        {
            "id": f.id,
            "code": f.code,
            "name": f.name,
            "description": f.description,
            "required_level": f.required_level,
            "unlocked": f.id in unlocked_ids,
        }
        for f in service.gamification.db.query(UnlockableFeature).filter_by(is_active=True).all()
    ]


@router.get("/features/{feature_code}/access")
async def check_feature_access(
    feature_code: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = RewardsService(db)
    has_access = service.check_feature_access(user.id, feature_code)
    return {"has_access": has_access}


# Settings
@router.get("/settings")
async def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = RewardsService(db)
    s = service.get_settings(user.id)
    return {
        "notifications_enabled": s.notifications_enabled,
        "achievement_notifications": s.achievement_notifications,
        "streak_reminders": s.streak_reminders,
        "challenge_reminders": s.challenge_reminders,
        "sound_effects": s.sound_effects,
        "share_achievements": s.share_achievements,
    }


class SettingsUpdate(BaseModel):
    notifications_enabled: Optional[bool] = None
    achievement_notifications: Optional[bool] = None
    streak_reminders: Optional[bool] = None
    challenge_reminders: Optional[bool] = None
    sound_effects: Optional[bool] = None
    share_achievements: Optional[bool] = None


@router.put("/settings")
async def update_settings(
    data: SettingsUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    service = RewardsService(db)
    kwargs = {k: v for k, v in data.model_dump().items() if v is not None}
    s = service.update_settings(user.id, **kwargs)
    return {"message": "Settings updated"}


# Seasonal Events
@router.get("/events/active")
async def get_active_event(db: Session = Depends(get_db)):
    service = RewardsService(db)
    event = service.get_active_event()
    if event:
        return {
            "name": event.name,
            "description": event.description,
            "icon": event.icon,
            "multiplier": event.xp_multiplier,
        }
    return {"name": None}


@router.get("/events/multiplier")
async def get_multiplier(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = RewardsService(db)
    return service.calculate_xp_with_bonus(user.id, 100)


# Initialize
@router.post("/initialize")
async def initialize_all(db: Session = Depends(get_db)):
    service = RewardsService(db)
    service.initialize_all()
    return {"message": "All rewards data initialized"}
