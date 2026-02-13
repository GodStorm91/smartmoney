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


class SuggestedAction(BaseModel):
    """Suggested action from AI response."""

    type: Literal["create_goal", "create_budget", "create_transaction"]
    payload: dict
    description: str


class ChatResponse(BaseModel):
    """Response from chat endpoint."""

    message: str
    suggested_action: Optional[SuggestedAction] = None
    credits_remaining: float
