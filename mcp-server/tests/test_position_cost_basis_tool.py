"""Tests for the position cost-basis MCP write tool."""
import json

import httpx
import pytest
from starlette.datastructures import Headers, QueryParams

import smartmoney_mcp.backend_client as bc
from smartmoney_mcp.backend_client import AuthError
from smartmoney_mcp.tools.write_tools import set_position_cost_basis


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
    state = {
        "status": 200,
        "json": {"position_id": "lp-1", "basis_source": "manual"},
        "request": None,
    }

    def handler(request: httpx.Request) -> httpx.Response:
        state["request"] = request
        return httpx.Response(state["status"], json=state["json"])

    real_cls = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_cls(*args, **kwargs)

    monkeypatch.setattr(bc.httpx, "AsyncClient", factory)
    return state


async def test_set_position_cost_basis_sends_put_body(fake_request, mock_backend):
    expected = {
        "position_id": "lp-1",
        "manual_basis_usd": 1500.25,
        "note": "reconciled from tx history",
    }
    mock_backend["json"] = {"ok": True}
    fake_request(query="token=write-jwt")

    result = await set_position_cost_basis(
        position_id="lp-1",
        amount_usd=1500.25,
        note="reconciled from tx history",
    )

    req = mock_backend["request"]
    assert req.method == "PUT"
    assert req.url.path == "/api/crypto/positions/cost-basis"
    assert req.headers["authorization"] == "Bearer write-jwt"
    assert json.loads(req.content) == expected
    assert result == {"ok": True}


async def test_set_position_cost_basis_preserves_null_clear(fake_request, mock_backend):
    fake_request(query="token=write-jwt")

    await set_position_cost_basis(position_id="lp-1", amount_usd=None)

    req = mock_backend["request"]
    assert json.loads(req.content) == {
        "position_id": "lp-1",
        "manual_basis_usd": None,
        "note": None,
    }


async def test_set_position_cost_basis_403_mentions_write_token(
    fake_request,
    mock_backend,
):
    mock_backend["status"] = 403
    mock_backend["json"] = {"detail": "MCP tokens are read-only"}
    fake_request(query="token=read-jwt")

    with pytest.raises(AuthError) as exc:
        await set_position_cost_basis(position_id="lp-1", amount_usd=1.0)

    message = str(exc.value)
    assert "Write token" in message
    assert "Settings" in message
