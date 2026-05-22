"""MCP (OpenClaw) access token management.

Single active token per user. Issuing rotates the jti (invalidating any prior
token); revoking clears it. These endpoints are reached with the user's normal
web ACCESS token — MCP tokens themselves are read-only and 403 on POST/DELETE.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..auth.utils import create_mcp_token
from ..database import get_db
from ..models.user import User
from ..schemas.mcp_token import McpTokenResponse, McpTokenStatus

router = APIRouter(prefix="/api/auth/mcp-token", tags=["mcp-token"])

MCP_TOKEN_EXPIRE_DAYS = 365


@router.post("", response_model=McpTokenResponse)
async def issue_mcp_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Issue a new MCP token, rotating out any previous one."""
    jti = uuid.uuid4().hex
    token = create_mcp_token(
        data={"sub": current_user.id}, jti=jti, expires_days=MCP_TOKEN_EXPIRE_DAYS
    )
    current_user.mcp_token_jti = jti
    current_user.mcp_token_created_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    return McpTokenResponse(
        token=token,
        created_at=current_user.mcp_token_created_at,
        expires_days=MCP_TOKEN_EXPIRE_DAYS,
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_mcp_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke the active MCP token (clears jti — all MCP tokens now rejected)."""
    current_user.mcp_token_jti = None
    current_user.mcp_token_created_at = None
    db.commit()


@router.get("", response_model=McpTokenStatus)
async def get_mcp_token_status(
    current_user: User = Depends(get_current_user),
):
    """Report whether an MCP token is active (never returns the token)."""
    return McpTokenStatus(
        enabled=current_user.mcp_token_jti is not None,
        created_at=current_user.mcp_token_created_at,
    )
