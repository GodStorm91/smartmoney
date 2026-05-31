"""Tests for the import_csv write tool and backend_post_multipart helper.

Uses the same mock_backend + fake_request fixture pattern from test_token_extraction.py.
"""
import base64

import httpx
import pytest
from starlette.datastructures import Headers, QueryParams

import smartmoney_mcp.backend_client as bc
from smartmoney_mcp.backend_client import AuthError
from smartmoney_mcp.tools.write_tools import import_csv


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


# --- tests --------------------------------------------------------------------

async def test_import_csv_happy_path(fake_request, mock_backend):
    raw_csv = b"date,amount\n2026-01-01,1000\n"
    csv_b64 = base64.b64encode(raw_csv).decode()
    expected = {"filename": "test.csv", "total_rows": 1, "created": 1, "skipped": 0, "message": "ok"}
    mock_backend["json"] = expected

    fake_request(query="token=write-jwt")
    result = await import_csv(source="paypay", csv_base64=csv_b64, filename="test.csv")

    req = mock_backend["request"]
    # Authorization header forwarded correctly
    assert req.headers["authorization"] == "Bearer write-jwt"
    # source query param present
    assert req.url.params.get("source") == "paypay"
    # Decoded bytes are in the multipart body
    assert raw_csv in req.content
    # Return value matches backend JSON
    assert result == expected


async def test_import_csv_invalid_base64_raises_valueerror(fake_request):
    fake_request(query="token=write-jwt")
    with pytest.raises(ValueError, match="csv_base64 is not valid base64"):
        await import_csv(source="paypay", csv_base64="not!!valid==base64$$")


async def test_import_csv_401_maps_to_write_token_error(fake_request, mock_backend):
    raw_csv = b"date,amount\n2026-01-01,500\n"
    csv_b64 = base64.b64encode(raw_csv).decode()
    mock_backend["status"] = 401

    fake_request(query="token=revoked-write-jwt")
    with pytest.raises(AuthError, match="(?i)write.*token.*revoked or expired"):
        await import_csv(source="paypay", csv_base64=csv_b64)


async def test_import_csv_403_distinguishes_read_token(fake_request, mock_backend):
    raw_csv = b"date,amount\n2026-01-01,500\n"
    csv_b64 = base64.b64encode(raw_csv).decode()
    mock_backend["status"] = 403

    fake_request(query="token=read-only-jwt")
    with pytest.raises(AuthError) as exc:
        await import_csv(source="paypay", csv_base64=csv_b64)
    msg = str(exc.value)
    assert "Write token" in msg
    assert "Settings" in msg


async def test_import_csv_422_surfaces_backend_detail(fake_request, mock_backend):
    raw_csv = b"bad,csv\ndata\n"
    csv_b64 = base64.b64encode(raw_csv).decode()
    mock_backend["status"] = 422
    mock_backend["json"] = {"detail": "Unrecognized CSV format for source 'paypay'"}

    fake_request(query="token=write-jwt")
    with pytest.raises(RuntimeError, match="Unrecognized CSV format"):
        await import_csv(source="paypay", csv_base64=csv_b64)


async def test_import_csv_5xx_hides_topology(fake_request, mock_backend):
    raw_csv = b"date,amount\n2026-01-01,100\n"
    csv_b64 = base64.b64encode(raw_csv).decode()
    mock_backend["status"] = 500

    fake_request(query="token=write-jwt")
    with pytest.raises(RuntimeError) as exc:
        await import_csv(source="paypay", csv_base64=csv_b64)
    msg = str(exc.value).lower()
    assert "backend" not in msg
    assert "8000" not in msg
