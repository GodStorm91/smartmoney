"""Tests for DeFi/crypto MCP read tools."""
import httpx
import pytest
from starlette.datastructures import Headers, QueryParams

import smartmoney_mcp.backend_client as bc
from smartmoney_mcp.tools.read_tools import (
    get_defi_positions,
    get_merkl_rewards,
    get_position_history,
    get_unclaimed_rewards,
    get_wallet_portfolio,
    get_wallets,
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


async def test_get_wallets_happy_path(fake_request, mock_backend):
    expected = [{"id": 7, "wallet_address": "0xabc", "label": "Base"}]
    mock_backend["json"] = expected
    fake_request(query="token=read-jwt")

    result = await get_wallets()

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/wallets"
    assert req.headers["authorization"] == "Bearer read-jwt"
    assert result == expected


async def test_get_wallet_portfolio_passes_id_in_path(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_wallet_portfolio(wallet_id=7)

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/wallets/7/portfolio"


async def test_get_defi_positions_passes_id_in_path(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_defi_positions(wallet_id=7)

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/wallets/7/defi-positions"


async def test_get_unclaimed_rewards_happy_path(fake_request, mock_backend):
    expected = [{"id": 1, "token_symbol": "AERO"}]
    mock_backend["json"] = expected
    fake_request(query="token=read-jwt")

    result = await get_unclaimed_rewards()

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/claims"
    assert result == expected


async def test_get_position_history_passes_days_query(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_position_history(position_id="base:0xABC", days=90)

    req = mock_backend["request"]
    assert req.method == "GET"
    assert req.url.path == "/api/crypto/positions/base:0xABC/history"
    assert req.url.params["days"] == "90"


async def test_get_merkl_rewards_chain_query(fake_request, mock_backend):
    fake_request(query="token=read-jwt")

    await get_merkl_rewards(wallet_id=7)
    default_req = mock_backend["request"]
    assert default_req.method == "GET"
    assert default_req.url.path == "/api/crypto/wallets/7/merkl-rewards"
    assert default_req.url.params["chain"] == "base"

    await get_merkl_rewards(wallet_id=7, chain="polygon")
    custom_req = mock_backend["request"]
    assert custom_req.url.path == "/api/crypto/wallets/7/merkl-rewards"
    assert custom_req.url.params["chain"] == "polygon"
