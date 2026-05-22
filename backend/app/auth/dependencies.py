"""Auth dependencies for FastAPI."""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# MCP tokens are read-only: only these HTTP methods are permitted for them.
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Get the current authenticated user from a JWT token.

    Accepts two token types:
      - "access": normal web session token, any HTTP method.
      - "mcp": long-lived OpenClaw token. Revocable via the user's stored jti
        and restricted to safe (read-only) HTTP methods.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id_str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id_str is None or token_type not in ("access", "mcp"):
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception

    # MCP-specific gates: revocation (jti must match stored) + read-only.
    if token_type == "mcp":
        jti = payload.get("jti")
        if not jti or jti != user.mcp_token_jti:
            raise credentials_exception
        if request.method not in _SAFE_METHODS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MCP tokens are read-only",
            )

    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user and verify they are active."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
