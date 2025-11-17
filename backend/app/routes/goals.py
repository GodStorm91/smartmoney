"""Goal API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
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
):
    """Create a new financial goal."""
    try:
        # Validate years is one of 1, 3, 5, 10
        if goal.years not in [1, 3, 5, 10]:
            raise HTTPException(
                status_code=400,
                detail="Years must be one of: 1, 3, 5, 10"
            )

        # Check if goal for this year horizon already exists
        existing = GoalService.get_goal_by_years(db, goal.years)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Goal for {goal.years} years already exists"
            )

        created = GoalService.create_goal(db, goal.model_dump())
        return created

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=list[GoalResponse])
async def get_all_goals(
    db: Session = Depends(get_db),
):
    """Get all financial goals."""
    return GoalService.get_all_goals(db)


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    db: Session = Depends(get_db),
):
    """Get a goal by ID."""
    goal = GoalService.get_goal(db, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    goal_update: GoalUpdate,
    db: Session = Depends(get_db),
):
    """Update a goal."""
    updated = GoalService.update_goal(
        db, goal_id, goal_update.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Goal not found")
    return updated


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
):
    """Delete a goal."""
    deleted = GoalService.delete_goal(db, goal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Goal not found")
    return None


@router.get("/{goal_id}/progress", response_model=GoalProgressResponse)
async def get_goal_progress(
    goal_id: int,
    db: Session = Depends(get_db),
):
    """Get progress for a specific goal."""
    goal = GoalService.get_goal(db, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    progress = GoalService.calculate_goal_progress(db, goal)
    return progress
