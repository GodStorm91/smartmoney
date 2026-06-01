"""Tests for the evaluate_purchase MCP read tool.

Pattern mirrors test_token_extraction.py: mock_backend + fake_request fixtures
intercept outgoing httpx calls without a live backend.
"""
import httpx
import pytest
from starlette.datastructures import Headers, QueryParams

import smartmoney_mcp.backend_client as bc
from smartmoney_mcp.backend_client import AuthError, backend_get


class _FakeRequest:
    """Minimal stand-in for the Starlette request FastMCP exposes."""

    def __init__(self, query: str = "", headers: dict | None = None):
        self.query_params = QueryParams(query)
        self.headers = Headers(headers or {})


@pytest.fixture
def fake_request(monkeypatch):
    """Install a fake HTTP request; return a setter to configure it per test."""
    holder = {}
    monkeypatch.setattr(bc, "get_http_request", lambda: holder["req"])

    def _set(query: str = "", headers: dict | None = None):
        holder["req"] = _FakeRequest(query, headers)

    return _set


@pytest.fixture
def mock_backend(monkeypatch):
    """Intercept outgoing httpx calls. Mutate ['status']/['json']; read ['request']."""
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


async def test_evaluate_purchase_happy_path(fake_request, mock_backend):
    """Read token → correct outgoing GET with all params; backend JSON returned."""
    fake_request(query="token=read-jwt")
    mock_backend["json"] = {
        "category": "Food",
        "item_name": "Lunch",
        "price": 1500,
        "allocated": 50000,
        "spent_so_far": 38000,
        "remaining_before": 12000,
        "remaining_after": 10500,
        "days_until_month_end": 9,
        "three_month_avg_in_category": 47000,
        "verdict": "go",
        "reasoning": "Within budget. ¥10,500 left for 9 days; pace healthy.",
    }

    result = await backend_get(
        "/api/budgets/evaluate-purchase",
        {"price": 1500, "category": "Food", "item_name": "Lunch"},
    )

    req = mock_backend["request"]
    assert req.url.path == "/api/budgets/evaluate-purchase"
    assert req.url.params.get("price") == "1500"
    assert req.url.params.get("category") == "Food"
    assert req.url.params.get("item_name") == "Lunch"
    assert req.headers["authorization"] == "Bearer read-jwt"
    assert result["verdict"] == "go"
    assert result["remaining_after"] == 10500


async def test_evaluate_purchase_strips_none_item_name(fake_request, mock_backend):
    """When item_name is None, _clean() must drop it from the outgoing URL."""
    fake_request(query="token=read-jwt")
    mock_backend["json"] = {
        "category": "Food",
        "item_name": None,
        "price": 1500,
        "verdict": "go",
    }

    await backend_get(
        "/api/budgets/evaluate-purchase",
        {"price": 1500, "category": "Food", "item_name": None},
    )

    req = mock_backend["request"]
    # item_name must NOT appear in the query string
    assert "item_name" not in str(req.url)
    assert req.url.params.get("price") == "1500"
    assert req.url.params.get("category") == "Food"


async def test_evaluate_purchase_5xx_hides_topology(fake_request, mock_backend):
    """Backend 500 raises RuntimeError with no internal host/port in message."""
    fake_request(query="token=read-jwt")
    mock_backend["status"] = 500

    with pytest.raises(RuntimeError) as exc:
        await backend_get(
            "/api/budgets/evaluate-purchase",
            {"price": 1500, "category": "Food"},
        )

    msg = str(exc.value).lower()
    assert "backend" not in msg
    assert "8000" not in msg
