"""Schemas for MCP (OpenClaw) access token management."""
from datetime import datetime

from pydantic import BaseModel


class McpTokenResponse(BaseModel):
    """Returned ONCE on issue — the token is never retrievable again."""

    token: str
    created_at: datetime
    expires_days: int


class McpTokenStatus(BaseModel):
    """Status shown in Settings; never includes the token itself."""

    enabled: bool
    created_at: datetime | None = None
