"""Tests for DeFi P&L MCP read tools."""
import httpx
import pytest
from starlette.datastructures import Headers, QueryParams

import smartmoney_mcp.backend_client as bc
from smartmoney_mcp.tools.read_tools import (
    get_closed_positions,
    get_il_scenarios,
    get_lp_real_pnl,
    get_position_insights,
    get_position_performance,
    get_wallet_performance,
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


async def test_get_wallet_performance_passes_id_in_path(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_wallet_performance(wallet_id=7)

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/wallets/7/performance"


async def test_get_position_performance_passes_id(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_position_performance(position_id="base:0xABC")

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/positions/base:0xABC/performance"


async def test_get_position_insights_passes_id(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_position_insights(position_id="base:0xABC")

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/positions/base:0xABC/insights"


async def test_get_il_scenarios_no_args(fake_request, mock_backend):
    expected = [{"price_change": "+50%", "il_percentage": -5.72}]
    mock_backend["json"] = expected
    fake_request(query="token=read-jwt")

    result = await get_il_scenarios()

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/il/scenarios"
    assert result == expected


async def test_get_closed_positions_query_params(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_closed_positions(wallet_id=7, limit=10)
    filtered_req = mock_backend["request"]
    assert filtered_req.method == "GET"
    assert filtered_req.url.path == "/api/crypto/closed-positions"
    assert filtered_req.url.params["wallet_id"] == "7"
    assert filtered_req.url.params["limit"] == "10"

    await get_closed_positions(limit=25)
    unfiltered_req = mock_backend["request"]
    assert unfiltered_req.url.path == "/api/crypto/closed-positions"
    assert unfiltered_req.url.params["limit"] == "25"
    assert "wallet_id" not in unfiltered_req.url.params


async def test_get_lp_real_pnl_query_params(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_lp_real_pnl(wallet_id=7, chain="base", include_closed=False, limit=10)
    filtered_req = mock_backend["request"]
    assert filtered_req.method == "GET"
    assert filtered_req.url.path == "/api/crypto/lp-real-pnl"
    assert filtered_req.url.params["wallet_id"] == "7"
    assert filtered_req.url.params["chain"] == "base"
    assert filtered_req.url.params["include_closed"] == "false"
    assert filtered_req.url.params["limit"] == "10"

    await get_lp_real_pnl(chain="polygon", limit=25)
    unfiltered_req = mock_backend["request"]
    assert unfiltered_req.url.path == "/api/crypto/lp-real-pnl"
    assert unfiltered_req.url.params["chain"] == "polygon"
    assert unfiltered_req.url.params["limit"] == "25"
    assert "wallet_id" not in unfiltered_req.url.params
