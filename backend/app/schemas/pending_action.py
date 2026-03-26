"""Pydantic schemas for pending actions."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PendingActionResponse(BaseModel):
    """Single pending action response."""

    id: int
    user_id: int
    type: str
    surface: str
    title: str
    description: str | None
    params: dict[str, Any]
    status: str
    priority: int
    created_at: datetime
    surfaced_at: datetime | None
    expires_at: datetime | None
    executed_at: datetime | None
    dismissed_at: datetime | None
    undone_at: datetime | None

    model_config = {"from_attributes": True}


class PendingActionListResponse(BaseModel):
    """List of pending actions with count."""

    actions: list[PendingActionResponse]
    count: int


class ActionExecuteResponse(BaseModel):
    """Response after executing or undoing an action."""

    success: bool
    message: str
    undo_available: bool = False


class ActionDismissResponse(BaseModel):
    """Response after dismissing an action."""

    success: bool
    message: str
