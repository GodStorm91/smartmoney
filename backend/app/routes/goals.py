"""Goal API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.goal import (
    GoalCreate,
    GoalProgressResponse,
    GoalReorderRequest,
    GoalResponse,
    GoalTemplateResponse,
    GoalUpdate,
)
from ..services.goal_service import GoalService
from ..services.claude_ai_service import ClaudeAIService
from ..models.goal_type import GoalType

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new financial goal."""
    try:
        goal_data = goal.model_dump()
        goal_data["user_id"] = current_user.id

        # Emergency fund enforcement: must be first goal if creating one
        if goal_data.get("goal_type") == "emergency_fund":
            if GoalService.has_emergency_fund(db, current_user.id):
                raise HTTPException(
                    status_code=400,
                    detail="Emergency fund goal already exists"
                )
            goal_data["priority"] = 1
        else:
            # Assign next available priority
            goal_data["priority"] = GoalService.get_next_priority(db, current_user.id)

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


@router.get("/status/has-emergency-fund")
async def has_emergency_fund(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if user has an emergency fund goal."""
    return {"has_emergency_fund": GoalService.has_emergency_fund(db, current_user.id)}


@router.post("/reorder", response_model=list[GoalResponse])
async def reorder_goals(
    request: GoalReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder goals by priority. Emergency fund must remain #1."""
    try:
        return GoalService.reorder_goals(db, current_user.id, request.goal_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/templates/{goal_type}", response_model=GoalTemplateResponse)
async def get_goal_template(
    goal_type: GoalType,
    years: int = Query(3, ge=1, le=10, description="Goal timeline in years"),
    language: str = Query("ja", description="Language for advice (ja, en, vi)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-suggested goal template for a specific goal type."""
    goal_type_value = goal_type.value  # Extract string value from enum

    try:
        ai_service = ClaudeAIService()
        suggestion, _ = ai_service.generate_goal_suggestion(
            db=db,
            user_id=current_user.id,
            goal_type=goal_type_value,
            years=years,
            language=language
        )
        return GoalTemplateResponse(
            goal_type=goal_type_value,
            suggested_target=suggestion.get("suggested_target", 0),
            suggested_years=years,
            monthly_required=suggestion.get("monthly_required", 0),
            achievable=suggestion.get("achievable", False),
            advice=suggestion.get("advice", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI suggestion failed: {str(e)}")
