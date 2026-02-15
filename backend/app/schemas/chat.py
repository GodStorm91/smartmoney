"""Chat schemas for API validation."""
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single chat message."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """Request for chat endpoint."""

    messages: list[ChatMessage] = Field(..., min_length=1, max_length=20)
    language: str = Field(default="ja", pattern="^(ja|en|vi)$")
    current_page: Optional[str] = Field(default=None, description="Current page/route user is viewing")


class SuggestedAction(BaseModel):
    """Suggested action from AI response."""

    type: Literal["create_goal", "create_budget", "create_transaction"]
    payload: dict
    description: str


class QuickAction(BaseModel):
    """Quick action navigation button."""

    label: str
    route: str
    icon: Optional[str] = None


class ChatResponse(BaseModel):
    """Response from chat endpoint."""

    message: str
    suggested_action: Optional[SuggestedAction] = None
    quick_actions: list[QuickAction] = Field(default_factory=list)
    credits_remaining: float
