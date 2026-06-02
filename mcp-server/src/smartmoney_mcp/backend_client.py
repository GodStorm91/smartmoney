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


async def backend_post_json(
    path: str,
    json_body: dict,
    params: dict | None = None,
) -> dict:
    """POST application/json to a SmartMoney backend endpoint.

    Used for write tools that submit structured payloads (e.g. AI categorization
    suggest/apply). 402 PAYMENT_REQUIRED is surfaced with backend detail since
    "insufficient credits" is actionable info for the user.
    """
    return await _backend_json_request("POST", path, json_body, params)


async def backend_patch_json(
    path: str,
    json_body: dict,
    params: dict | None = None,
) -> dict:
    """PATCH application/json to a SmartMoney backend endpoint."""
    return await _backend_json_request("PATCH", path, json_body, params)


async def backend_put_json(
    path: str,
    json_body: dict,
    params: dict | None = None,
) -> dict:
    """PUT application/json to a SmartMoney backend endpoint."""
    return await _backend_json_request(
        "PUT", path, json_body, params, clean_json=False
    )


async def _backend_json_request(
    method: str,
    path: str,
    json_body: dict,
    params: dict | None = None,
    clean_json: bool = True,
) -> dict:
    """Send a JSON write request with consistent MCP auth error handling."""
    token = _extract_token()
    headers = {"Authorization": f"Bearer {token}"}
    body = _clean(json_body) if clean_json else json_body
    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=BACKEND_TIMEOUT) as client:
        resp = await client.request(
            method,
            path,
            params=_clean(params),
            json=body or {},
            headers=headers,
        )
        if resp.status_code == 401:
            raise AuthError(
                "Write MCP token revoked or expired. "
                "Generate a new Write token in Settings."
            )
        if resp.status_code == 403:
            raise AuthError(
                "This is a read-only MCP token. "
                "Generate a Write token in Settings → MCP Write Token section."
            )
        if resp.status_code in (400, 402, 404, 422):
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text
            raise RuntimeError(f"SmartMoney rejected the request: {detail}")
        if resp.status_code >= 400:
            raise RuntimeError(
                f"SmartMoney returned an error ({resp.status_code})."
            )
        return resp.json()


async def backend_post_multipart(
    path: str,
    files: dict,
    params: dict | None = None,
) -> dict:
    """POST multipart/form-data to a SmartMoney backend endpoint.

    Used exclusively for write operations (CSV import etc.) that require a
    Write MCP token. Read tokens will get a clear 403 explaining the fix.
    """
    token = _extract_token()
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=BACKEND_TIMEOUT) as client:
        resp = await client.post(
            path, params=_clean(params), files=files, headers=headers
        )
        if resp.status_code == 401:
            raise AuthError(
                "Write MCP token revoked or expired. "
                "Generate a new Write token in Settings."
            )
        if resp.status_code == 403:
            raise AuthError(
                "This is a read-only MCP token. "
                "Generate a Write token in Settings → MCP Write Token section."
            )
        if resp.status_code in (400, 422):
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text
            raise RuntimeError(f"CSV rejected by SmartMoney: {detail}")
        if resp.status_code >= 400:
            raise RuntimeError(
                f"SmartMoney returned an error ({resp.status_code}) during upload."
            )
        return resp.json()


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
