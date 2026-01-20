"""
Gamification API routes
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.services.gamification_service import GamificationService
from app.auth.dependencies import get_current_user
from app.models.user import User


router = APIRouter(prefix="/api/gamification", tags=["gamification"])


class XPActionRequest(BaseModel):
    """Request model for tracking XP actions"""

    action: str
    metadata: Dict[str, Any] = {}


class AchievementResponse(BaseModel):
    """Response model for achievements"""

    id: int
    code: str
    name: str
    description: str
    xp_reward: int
    icon: str
    rarity: str


class GamificationStatsResponse(BaseModel):
    """Response model for user gamification stats"""

    total_xp: int
    current_level: int
    xp_to_next_level: int
    current_streak: int
    longest_streak: int
    achievements_unlocked: int
    achievements_total: int
    recent_xp_events: List[Dict[str, Any]]


@router.post("/action")
async def track_action(
    request: XPActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Track a user action and award XP"""
    service = GamificationService(db)
    result = service.award_xp(current_user.id, request.action, request.metadata)
    return result


@router.post("/login")
async def track_login(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Track daily login and update streak"""
    service = GamificationService(db)
    result = service.update_login_streak(current_user.id)
    return result


@router.get("/stats")
async def get_gamification_stats(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> GamificationStatsResponse:
    """Get user's gamification statistics"""
    service = GamificationService(db)
    stats = service.get_user_stats(current_user.id)
    return GamificationStatsResponse(**stats)


@router.get("/achievements")
async def get_achievements(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get all achievements and user's progress"""
    from app.models.gamification import Achievement, UserAchievement

    # Get all achievements
    all_achievements = db.query(Achievement).all()

    # Get user's unlocked achievements
    user_achievements = db.query(UserAchievement).filter_by(user_id=current_user.id).all()

    # Create a map of achievement progress
    progress_map = {
        ua.achievement_id: {
            "progress": ua.progress,
            "unlocked_at": ua.unlocked_at.isoformat() if ua.unlocked_at else None,
        }
        for ua in user_achievements
    }

    # Format response
    achievements = []
    for achievement in all_achievements:
        achievement_data = {
            "id": achievement.id,
            "code": achievement.code,
            "name": achievement.name,
            "description": achievement.description,
            "category": achievement.category,
            "xp_reward": achievement.xp_reward,
            "icon": achievement.icon,
            "rarity": achievement.rarity,
            "unlocked": False,
            "progress": 0,
            "unlocked_at": None,
        }

        if achievement.id in progress_map:
            achievement_data["progress"] = progress_map[achievement.id]["progress"]
            achievement_data["unlocked"] = progress_map[achievement.id]["progress"] >= 100
            achievement_data["unlocked_at"] = progress_map[achievement.id]["unlocked_at"]

        achievements.append(achievement_data)

    # Sort by category and unlocked status
    achievements.sort(key=lambda x: (not x["unlocked"], x["category"], x["name"]))

    return {
        "achievements": achievements,
        "total": len(all_achievements),
        "unlocked": sum(1 for a in achievements if a["unlocked"]),
    }


@router.post("/initialize-achievements")
async def initialize_achievements(db: Session = Depends(get_db)) -> Dict[str, str]:
    """Initialize basic achievements (admin only - temporary endpoint)"""
    service = GamificationService(db)
    service.initialize_basic_achievements()
    return {"message": "Basic achievements initialized successfully"}
