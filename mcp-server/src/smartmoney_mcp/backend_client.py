"""Thin authenticated client to the SmartMoney REST API.

Token extraction order (read-only design):
  1. `?token=` query param — PRIMARY. OpenClaw's streamable-http client drops
     custom headers (openclaw/openclaw#65590), so the token rides in the URL.
  2. `Authorization: Bearer` header — fallback for well-behaved clients.

The MCP server never validates the token itself — it forwards it to the
backend, which is the sole auth authority (signature, expiry, jti revocation,
read-only method gate).
"""
import httpx
from fastmcp.server.dependencies import get_http_request

from .config import BACKEND_TIMEOUT, BACKEND_URL


class AuthError(Exception):
    """Raised when no token is present or the backend rejects it."""


def _extract_token() -> str:
    request = get_http_request()
    token = request.query_params.get("token")
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:]
    if not token:
        raise AuthError(
            "Missing MCP token. Pass it as ?token=... in the server URL "
            "(or an Authorization: Bearer header)."
        )
    return token


def _clean(params: dict | None) -> dict | None:
    """Drop None-valued params so optional filters don't leak as empty query keys."""
    if not params:
        return None
    cleaned = {k: v for k, v in params.items() if v is not None}
    return cleaned or None


async def backend_get(path: str, params: dict | None = None):
    """GET an endpoint on the SmartMoney backend with the caller's token.

    Translates backend auth failures into clear AuthError messages so the
    agent (and user) understand a revoked/expired token vs a real error.
    """
    token = _extract_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=BACKEND_TIMEOUT) as client:
        resp = await client.get(path, params=_clean(params), headers=headers)
        if resp.status_code == 401:
            raise AuthError(
                "SmartMoney rejected the token — it may be revoked or expired. "
                "Generate a new MCP token in Settings."
            )
        if resp.status_code == 403:
            raise AuthError("Forbidden — MCP tokens are read-only.")
        if resp.status_code >= 400:
            # Don't surface internal URL/topology (e.g. http://backend:8000/...)
            # to the external agent; keep it generic.
            raise RuntimeError(
                f"SmartMoney returned an error ({resp.status_code}) fetching this data."
            )
        return resp.json()
