"""Health Score API route."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..services.health_score_service import get_health_score_service

router = APIRouter(prefix="/api/health-score", tags=["health-score"])


@router.get("")
async def get_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get financial health score for current user."""
    service = get_health_score_service()
    return service.calculate_health_score(db=db, user_id=current_user.id)
