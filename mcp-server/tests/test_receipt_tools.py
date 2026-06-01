"""Tests for scan_receipt + apply_receipt_scan write tools.

Mirrors test_ai_categorize.py: httpx MockTransport intercept + monkeypatched
get_http_request via fake_request fixture.
"""
import json

import httpx
import pytest
from starlette.datastructures import Headers, QueryParams

import smartmoney_mcp.backend_client as bc
from smartmoney_mcp.backend_client import AuthError
from smartmoney_mcp.tools.write_tools import apply_receipt_scan, scan_receipt


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


# --- scan_receipt -------------------------------------------------------------

async def test_scan_receipt_happy_path(fake_request, mock_backend):
    """scan_receipt posts to /api/receipts/scan with image + media_type, returns backend shape."""
    expected = {
        "success": True,
        "data": {
            "amount": 980,
            "date": "2026-05-31",
            "merchant": "Lawson",
            "category": "Food",
            "confidence": {"amount": 0.95, "date": 0.9, "merchant": 0.88},
            "warnings": [],
        },
    }
    mock_backend["json"] = expected
    fake_request(query="token=write-jwt")

    result = await scan_receipt(image_base64="abc123base64==", mime_type="image/jpeg")

    req = mock_backend["request"]
    assert req.url.path == "/api/receipts/scan"
    assert req.headers["authorization"] == "Bearer write-jwt"
    body = json.loads(req.content)
    assert body == {"image": "abc123base64==", "media_type": "image/jpeg"}
    assert result == expected


async def test_scan_receipt_default_mime_type(fake_request, mock_backend):
    """Omitting mime_type sends image/jpeg default."""
    mock_backend["json"] = {"success": True, "data": {}}
    fake_request(query="token=write-jwt")

    await scan_receipt(image_base64="somebase64")

    body = json.loads(mock_backend["request"].content)
    assert body["media_type"] == "image/jpeg"


async def test_scan_receipt_403_distinguishes_read_token(fake_request, mock_backend):
    """403 response → AuthError mentioning 'Write token' and 'Settings'."""
    mock_backend["status"] = 403
    fake_request(query="token=read-only-jwt")

    with pytest.raises(AuthError) as exc:
        await scan_receipt(image_base64="abc123")
    msg = str(exc.value)
    assert "Write token" in msg
    assert "Settings" in msg


# --- apply_receipt_scan -------------------------------------------------------

async def test_apply_receipt_scan_happy_path(fake_request, mock_backend):
    """apply_receipt_scan posts all fields to /api/receipts/apply-scan."""
    expected = {
        "transaction_id": 42,
        "description": "7-Eleven Harajuku",
        "amount": 650,
        "date": "2026-05-31",
        "category": "Food",
        "source": "Receipt",
        "is_income": False,
    }
    mock_backend["json"] = expected
    fake_request(query="token=write-jwt")

    result = await apply_receipt_scan(
        amount=650,
        date="2026-05-31",
        merchant="7-Eleven Harajuku",
        category="Food",
        is_income=False,
        currency="JPY",
    )

    req = mock_backend["request"]
    assert req.url.path == "/api/receipts/apply-scan"
    assert req.headers["authorization"] == "Bearer write-jwt"
    body = json.loads(req.content)
    assert body == {
        "amount": 650,
        "date": "2026-05-31",
        "merchant": "7-Eleven Harajuku",
        "category": "Food",
        "is_income": False,
        "currency": "JPY",
    }
    assert result == expected


async def test_apply_receipt_scan_minimal_fields_use_defaults(fake_request, mock_backend):
    """Only required fields (amount/date/merchant) → defaults applied for rest."""
    mock_backend["json"] = {
        "transaction_id": 99,
        "description": "Unknown Store",
        "amount": 500,
        "date": "2026-06-01",
        "category": "Other",
        "source": "Receipt",
        "is_income": False,
    }
    fake_request(query="token=write-jwt")

    await apply_receipt_scan(amount=500, date="2026-06-01", merchant="Unknown Store")

    body = json.loads(mock_backend["request"].content)
    # Defaults applied
    assert body["category"] == "Other"
    assert body["is_income"] is False
    assert body["currency"] == "JPY"


async def test_apply_receipt_scan_5xx_hides_topology(fake_request, mock_backend):
    """5xx response → RuntimeError without backend URL/port in message."""
    mock_backend["status"] = 500
    fake_request(query="token=write-jwt")

    with pytest.raises(RuntimeError) as exc:
        await apply_receipt_scan(
            amount=100, date="2026-06-01", merchant="Test Store"
        )
    msg = str(exc.value)
    # Must not leak internal topology
    assert "backend" not in msg.lower() or "8000" not in msg
    assert "8000" not in msg
