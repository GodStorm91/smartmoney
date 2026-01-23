"""
Challenge API routes
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..services.challenge_service import ChallengeService
from ..services.achievement_initializer import AchievementInitializer
from ..auth.dependencies import get_current_user
from ..models.user import User


router = APIRouter(prefix="/api/challenges", tags=["challenges"])


class StartChallengeRequest(BaseModel):
    """Request model for starting a challenge"""

    challenge_id: int


class ChallengeResponse(BaseModel):
    """Response model for challenges"""

    id: int
    code: str
    name: str
    description: str
    type: str
    category: Optional[str]
    xp_reward: int
    icon: Optional[str]
    requirements: Optional[Dict[str, Any]]
    is_active: bool
    is_available: bool


class UserChallengeResponse(BaseModel):
    """Response model for user challenges"""

    id: int
    challenge_id: int
    challenge: ChallengeResponse
    progress: int
    target: int
    status: str
    progress_percentage: float
    started_at: str
    completed_at: Optional[str]


@router.get("/available")
async def get_available_challenges(
    challenge_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ChallengeResponse]:
    """Get all available challenges"""
    service = ChallengeService(db)
    challenges = service.get_active_challenges(challenge_type)

    return [
        ChallengeResponse(
            id=c.id,
            code=c.code,
            name=c.name,
            description=c.description,
            type=c.type,
            category=c.category,
            xp_reward=c.xp_reward,
            icon=c.icon,
            requirements=c.requirements,
            is_active=c.is_active,
            is_available=c.is_available(),
        )
        for c in challenges
    ]


@router.get("/my-challenges")
async def get_my_challenges(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[UserChallengeResponse]:
    """Get user's challenges"""
    service = ChallengeService(db)
    user_challenges = service.get_user_challenges(current_user.id, status)

    return [
        UserChallengeResponse(
            id=uc.id,
            challenge_id=uc.challenge_id,
            challenge=ChallengeResponse(
                id=uc.challenge.id,
                code=uc.challenge.code,
                name=uc.challenge.name,
                description=uc.challenge.description,
                type=uc.challenge.type,
                category=uc.challenge.category,
                xp_reward=uc.challenge.xp_reward,
                icon=uc.challenge.icon,
                requirements=uc.challenge.requirements,
                is_active=uc.challenge.is_active,
                is_available=uc.challenge.is_available(),
            ),
            progress=uc.progress,
            target=uc.target,
            status=uc.status,
            progress_percentage=uc.progress_percentage,
            started_at=uc.started_at.isoformat(),
            completed_at=uc.completed_at.isoformat() if uc.completed_at else None,
        )
        for uc in user_challenges
    ]


@router.post("/start")
async def start_challenge(
    request: StartChallengeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserChallengeResponse:
    """Start a challenge"""
    service = ChallengeService(db)

    try:
        user_challenge = service.start_challenge(current_user.id, request.challenge_id)

        return UserChallengeResponse(
            id=user_challenge.id,
            challenge_id=user_challenge.challenge_id,
            challenge=ChallengeResponse(
                id=user_challenge.challenge.id,
                code=user_challenge.challenge.code,
                name=user_challenge.challenge.name,
                description=user_challenge.challenge.description,
                type=user_challenge.challenge.type,
                category=user_challenge.challenge.category,
                xp_reward=user_challenge.challenge.xp_reward,
                icon=user_challenge.challenge.icon,
                requirements=user_challenge.challenge.requirements,
                is_active=user_challenge.challenge.is_active,
                is_available=user_challenge.challenge.is_available(),
            ),
            progress=user_challenge.progress,
            target=user_challenge.target,
            status=user_challenge.status,
            progress_percentage=user_challenge.progress_percentage,
            started_at=user_challenge.started_at.isoformat(),
            completed_at=user_challenge.completed_at.isoformat()
            if user_challenge.completed_at
            else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/initialize-challenges")
async def initialize_challenges(db: Session = Depends(get_db)) -> Dict[str, str]:
    """Initialize all challenges (admin only - temporary endpoint)"""
    service = ChallengeService(db)

    # Initialize daily challenges
    service.initialize_daily_challenges()

    # Initialize weekly challenges
    service.initialize_weekly_challenges()

    # Initialize monthly challenges
    service.initialize_monthly_challenges()

    return {"message": "Challenges initialized successfully"}


@router.post("/initialize-all-achievements")
async def initialize_all_achievements(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Initialize all achievements (admin only - temporary endpoint)"""
    count = AchievementInitializer.initialize_all_achievements(db)
    return {"message": f"Initialized {count} achievements successfully"}
