"""Goal API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.goal import (
    GoalCreate,
    GoalProgressResponse,
    GoalResponse,
    GoalUpdate,
)
from ..services.goal_service import GoalService

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new financial goal."""
    try:
        # Pydantic schema already validates 1-10 years range

        # Check if goal for this year horizon already exists for this user
        existing = GoalService.get_goal_by_years(db, current_user.id, goal.years)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Goal for {goal.years} years already exists"
            )

        goal_data = goal.model_dump()
        goal_data["user_id"] = current_user.id
        created = GoalService.create_goal(db, goal_data)
        return created

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[GoalResponse])
async def get_all_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all financial goals."""
    return GoalService.get_all_goals(db, current_user.id)


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a goal by ID."""
    goal = GoalService.get_goal(db, current_user.id, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_update: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a goal."""
    updated = GoalService.update_goal(
        db, current_user.id, goal_id, goal_update.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found")
    return updated


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a goal."""
    deleted = GoalService.delete_goal(db, current_user.id, goal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Goal not found")
    return None


@router.get("/{goal_id}/progress", response_model=GoalProgressResponse)
async def get_goal_progress(
    goal_id: int,
    include_achievability: bool = Query(True, description="Include achievability metrics"),
    trend_months: int = Query(3, ge=1, le=24, description="Number of months for rolling average (1-24)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get progress for a specific goal with optional achievability metrics."""
    goal = GoalService.get_goal(db, current_user.id, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    progress = GoalService.calculate_goal_progress(db, current_user.id, goal)

    if include_achievability:
        progress["achievability"] = GoalService.calculate_achievability(db, current_user.id, goal, trend_months)

    return progress
