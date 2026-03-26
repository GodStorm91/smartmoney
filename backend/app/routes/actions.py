"""Pending actions API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.pending_action import (
    ActionDismissResponse,
    ActionExecuteResponse,
    PendingActionListResponse,
    PendingActionResponse,
)
from ..services.action_service import get_action_service

router = APIRouter(prefix="/api/actions", tags=["actions"])


@router.get("/pending", response_model=PendingActionListResponse)
async def get_pending_actions(
    surface: str | None = Query(default=None),
    limit: int = Query(default=5, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PendingActionListResponse:
    """Get pending actions, optionally filtered by surface."""
    service = get_action_service()
    actions = service.surface_actions(db, current_user.id, surface=surface, limit=limit)
    return PendingActionListResponse(
        actions=[PendingActionResponse.model_validate(a) for a in actions],
        count=len(actions),
    )


@router.get("/count")
async def get_action_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    """Get count of pending actions for badge display."""
    service = get_action_service()
    count = service.get_pending_count(db, current_user.id)
    return {"count": count}


@router.post("/{action_id}/execute", response_model=ActionExecuteResponse)
async def execute_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActionExecuteResponse:
    """Execute a pending action."""
    service = get_action_service()
    success, message, undo_available = service.execute_action(db, current_user.id, action_id)
    if not success and message == "Action not found":
        raise HTTPException(status_code=404, detail=message)
    return ActionExecuteResponse(success=success, message=message, undo_available=undo_available)


@router.post("/{action_id}/dismiss", response_model=ActionDismissResponse)
async def dismiss_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActionDismissResponse:
    """Dismiss a pending action."""
    service = get_action_service()
    success, message = service.dismiss_action(db, current_user.id, action_id)
    if not success and message == "Action not found":
        raise HTTPException(status_code=404, detail=message)
    return ActionDismissResponse(success=success, message=message)


@router.post("/{action_id}/undo", response_model=ActionExecuteResponse)
async def undo_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActionExecuteResponse:
    """Undo a previously executed action (within 24h)."""
    service = get_action_service()
    success, message, undo_available = service.undo_action(db, current_user.id, action_id)
    if not success and message == "Action not found":
        raise HTTPException(status_code=404, detail=message)
    return ActionExecuteResponse(success=success, message=message, undo_available=undo_available)
