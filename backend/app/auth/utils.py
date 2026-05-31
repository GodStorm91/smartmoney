"""Auth utilities for password hashing and JWT handling."""
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from ..config import settings


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    # Ensure sub is a string (JWT spec requirement)
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_mcp_token(data: dict, jti: str, expires_days: int = 365) -> str:
    """Create a long-lived JWT for MCP (OpenClaw) access.

    Carries type="mcp" and a jti so it can be revoked by rotating/clearing the
    user's stored jti. Read-only enforcement (safe HTTP methods only) lives in
    get_current_user.
    """
    to_encode = data.copy()
    # Ensure sub is a string (JWT spec requirement)
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)
    to_encode.update({"exp": expire, "type": "mcp", "jti": jti})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_mcp_write_token(data: dict, jti: str, expires_days: int = 30) -> str:
    """Create a short-lived JWT for MCP write access.

    Carries type="mcp_write" and a jti for revocation. Accepted only on
    endpoints listed in WRITE_TOKEN_ALLOWLIST in get_current_user.
    """
    to_encode = data.copy()
    # Ensure sub is a string (JWT spec requirement)
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)
    to_encode.update({"exp": expire, "type": "mcp_write", "jti": jti})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    # Ensure sub is a string (JWT spec requirement)
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except jwt.JWTError:
        return None
