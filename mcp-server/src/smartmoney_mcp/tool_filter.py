"""Token-type-based tool list filtering for the MCP server.

Decodes the JWT `type` claim (NO signature verification — backend is sole auth
authority) to tailor the tools/list surface per token type:

  type == "mcp"       → read-only surface: strip write tools
  type == "mcp_write" → write-only surface: keep ONLY write tools
  missing / malformed → return unchanged (fail-open; backend still gates calls)

This is a UX hint only. Any mismatch between token type and tool call is caught
by the backend (401/403) with clear messaging.
"""
import base64
import json
import logging
from collections.abc import Sequence

from fastmcp.server.middleware import CallNext, Middleware, MiddlewareContext
from fastmcp.server.dependencies import get_http_request
from fastmcp.tools.base import Tool

logger = logging.getLogger(__name__)

_WRITE_TOOL_NAMES = {
    "import_csv",
    "ai_categorize_suggest",
    "ai_categorize_apply",
    "scan_receipt",
    "apply_receipt_scan",
    "set_budget_allocations",
    "ai_suggest_budget",
}


def _decode_token_type(token: str | None) -> str | None:
    """Extract the `type` claim from a JWT without signature verification.

    Returns the claim string, or None if decoding fails for any reason.
    """
    if not token:
        return None
    try:
        import jwt  # PyJWT — already a transitive dependency of fastmcp
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("type")
    except Exception:
        return None


def _get_request_token() -> str | None:
    """Best-effort token extraction from the current HTTP request."""
    try:
        request = get_http_request()
        token = request.query_params.get("token")
        if not token:
            auth = request.headers.get("authorization", "")
            if auth.lower().startswith("bearer "):
                token = auth[7:]
        return token or None
    except Exception:
        return None


def filter_tools_by_token_type(tools: Sequence[Tool], token: str | None) -> list[Tool]:
    """Return a filtered tool list based on the JWT `type` claim.

    - type == "mcp"       → strip write tools
    - type == "mcp_write" → keep ONLY write tools
    - anything else       → return unchanged
    """
    token_type = _decode_token_type(token)
    tool_list = list(tools)

    if token_type == "mcp":
        return [t for t in tool_list if t.name not in _WRITE_TOOL_NAMES]
    if token_type == "mcp_write":
        return [t for t in tool_list if t.name in _WRITE_TOOL_NAMES]
    return tool_list


class TokenTypeToolFilter(Middleware):
    """FastMCP middleware that filters tools/list by the request token type."""

    async def on_list_tools(
        self,
        context: MiddlewareContext,
        call_next: CallNext,
    ) -> Sequence[Tool]:
        tools = await call_next(context)
        token = _get_request_token()
        return filter_tools_by_token_type(tools, token)
