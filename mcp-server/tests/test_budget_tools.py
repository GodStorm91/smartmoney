"""Tests for budget MCP read/write tools."""
import json

import httpx
import pytest
from starlette.datastructures import Headers, QueryParams

import smartmoney_mcp.backend_client as bc
from smartmoney_mcp.tools.read_tools import get_budget_suggestions
from smartmoney_mcp.tools.write_tools import ai_suggest_budget, set_budget_allocations


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


async def test_get_budget_suggestions_happy_path(fake_request, mock_backend):
    expected = {
        "has_previous": True,
        "previous_month": "2026-05",
        "previous_income": 400000,
        "previous_allocations": [{"category": "Food", "amount": 50000}],
    }
    mock_backend["json"] = expected
    fake_request(query="token=read-jwt")

    result = await get_budget_suggestions()

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/budgets/suggestions"
    assert req.headers["authorization"] == "Bearer read-jwt"
    assert result == expected


async def test_set_budget_allocations_passes_list(fake_request, mock_backend):
    expected = {
        "id": 7,
        "month": "2026-06",
        "monthly_income": 400000,
        "was_created": False,
        "allocations": [{"category": "Food", "amount": 50000}],
    }
    allocations = [{"category": "Food", "amount": 50000}]
    mock_backend["json"] = expected
    fake_request(query="token=write-jwt")

    result = await set_budget_allocations(allocations)

    req = mock_backend["request"]
    assert req.method == "PATCH"
    assert req.url.path == "/api/budgets/current/allocations"
    assert req.headers["authorization"] == "Bearer write-jwt"
    assert json.loads(req.content) == {"allocations": allocations}
    assert result == expected


async def test_ai_suggest_budget_passes_income_and_feedback(fake_request, mock_backend):
    expected = {
        "allocations": [{"category": "Transport", "amount": 20000}],
        "reasoning": "More transport",
        "credits_used": 0.36,
        "monthly_income": 400000,
    }
    mock_backend["json"] = expected
    fake_request(query="token=write-jwt")

    result = await ai_suggest_budget(
        monthly_income=400000,
        feedback="more transport",
    )

    req = mock_backend["request"]
    assert req.method == "POST"
    assert req.url.path == "/api/budgets/generate-preview"
    assert json.loads(req.content) == {
        "monthly_income": 400000,
        "feedback": "more transport",
    }
    assert result == expected


async def test_ai_suggest_budget_strips_none_feedback(fake_request, mock_backend):
    fake_request(query="token=write-jwt")

    await ai_suggest_budget(monthly_income=400000)

    req = mock_backend["request"]
    assert req.url.path == "/api/budgets/generate-preview"
    assert json.loads(req.content) == {"monthly_income": 400000}
