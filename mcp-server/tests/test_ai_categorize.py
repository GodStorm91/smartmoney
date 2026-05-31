"""Tests for ai_categorize_suggest + ai_categorize_apply write tools.

Reuses the mock_backend + fake_request fixture pattern from test_import_csv.py
(httpx MockTransport intercept + monkeypatched get_http_request).
"""
import httpx
import pytest
from starlette.datastructures import Headers, QueryParams

import smartmoney_mcp.backend_client as bc
from smartmoney_mcp.backend_client import AuthError
from smartmoney_mcp.tools.write_tools import (
    ai_categorize_apply,
    ai_categorize_suggest,
)


class _FakeRequest:
    def __init__(self, query: str = "", headers: dict | None = None):
        self.query_params = QueryParams(query)
        self.headers = Headers(headers or {})


@pytest.fixture
def fake_request(monkeypatch):
    holder = {}
    monkeypatch.setattr(bc, "get_http_request", lambda: holder["req"])

    def _set(query: str = "", headers: dict | None = None):
        holder["req"] = _FakeRequest(query, headers)

    return _set


@pytest.fixture
def mock_backend(monkeypatch):
    state = {"status": 200, "json": {"ok": True}, "request": None}

    def handler(request: httpx.Request) -> httpx.Response:
        state["request"] = request
        return httpx.Response(state["status"], json=state["json"])

    real_cls = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_cls(*args, **kwargs)

    monkeypatch.setattr(bc.httpx, "AsyncClient", factory)
    return state


# --- suggest ------------------------------------------------------------------

async def test_suggest_default_scope_hits_suggestions_endpoint(fake_request, mock_backend):
    expected = {
        "suggestions": [{"transaction_id": 1, "suggested_category": "Food"}],
        "total_other_count": 5,
        "credits_used": 0.42,
        "new_categories_suggested": [],
    }
    mock_backend["json"] = expected

    fake_request(query="token=write-jwt")
    result = await ai_categorize_suggest(limit=10, language="en")

    req = mock_backend["request"]
    assert req.url.path == "/api/ai/categorize/suggestions"
    assert req.headers["authorization"] == "Bearer write-jwt"
    import json as _json
    body = _json.loads(req.content)
    assert body == {"limit": 10, "language": "en"}
    assert result == expected


async def test_suggest_budget_scope_hits_budget_endpoint(fake_request, mock_backend):
    mock_backend["json"] = {"suggestions": [], "total_other_count": 0,
                            "credits_used": 0, "new_categories_suggested": []}

    fake_request(query="token=write-jwt")
    await ai_categorize_suggest(scope="budget", month="2026-05", limit=20)

    req = mock_backend["request"]
    assert req.url.path == "/api/ai/categorize/budget-suggestions"
    import json as _json
    body = _json.loads(req.content)
    assert body == {"month": "2026-05", "limit": 20, "language": "ja"}


async def test_suggest_budget_scope_missing_month_raises():
    with pytest.raises(ValueError, match="month is required when scope='budget'"):
        await ai_categorize_suggest(scope="budget")


async def test_suggest_invalid_scope_raises():
    with pytest.raises(ValueError, match="scope must be 'all' or 'budget'"):
        await ai_categorize_suggest(scope="nope")


async def test_suggest_402_surfaces_insufficient_credits(fake_request, mock_backend):
    mock_backend["status"] = 402
    mock_backend["json"] = {"detail": "Insufficient credits. Please purchase more credits."}

    fake_request(query="token=write-jwt")
    with pytest.raises(RuntimeError, match="Insufficient credits"):
        await ai_categorize_suggest()


async def test_suggest_403_distinguishes_read_token(fake_request, mock_backend):
    mock_backend["status"] = 403

    fake_request(query="token=read-only-jwt")
    with pytest.raises(AuthError) as exc:
        await ai_categorize_suggest()
    msg = str(exc.value)
    assert "Write token" in msg
    assert "Settings" in msg


# --- apply --------------------------------------------------------------------

async def test_apply_happy_path(fake_request, mock_backend):
    expected = {"updated_count": 3, "rules_created": 2, "failed_ids": []}
    mock_backend["json"] = expected
    approved = [
        {"transaction_id": 1, "category": "Food"},
        {"transaction_id": 2, "category": "Transport"},
        {"transaction_id": 3, "category": "Food"},
    ]

    fake_request(query="token=write-jwt")
    result = await ai_categorize_apply(approved=approved, create_rules=True)

    req = mock_backend["request"]
    assert req.url.path == "/api/ai/categorize/apply"
    import json as _json
    body = _json.loads(req.content)
    assert body == {"approved": approved, "create_rules": True}
    assert result == expected


async def test_apply_create_rules_false_passes_through(fake_request, mock_backend):
    mock_backend["json"] = {"updated_count": 1, "rules_created": 0, "failed_ids": []}

    fake_request(query="token=write-jwt")
    await ai_categorize_apply(
        approved=[{"transaction_id": 7, "category": "Misc"}],
        create_rules=False,
    )

    req = mock_backend["request"]
    import json as _json
    body = _json.loads(req.content)
    assert body["create_rules"] is False
