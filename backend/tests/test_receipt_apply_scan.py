"""Tests for POST /api/receipts/apply-scan endpoint.

Mirrors test_mcp_write_token.py: TestClient + temp SQLite + dependency override.
"""
import os
import tempfile
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.utils import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models.transaction import Base, Transaction
from app.models.user import User


@pytest.fixture(scope="module")
def client_and_tokens():
    """TestClient backed by a temp DB with one active user.

    Yields (client, access_token, write_token, read_mcp_token).
    """
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = Session()
        user = User(
            email="receipt@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        access_token = create_access_token(data={"sub": user.id})
        db.close()

        def override():
            s = Session()
            try:
                yield s
            finally:
                s.close()

        app.dependency_overrides[get_db] = override
        client = TestClient(app)

        # Issue a write token via the API
        resp = client.post(
            "/api/auth/mcp-write-token",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert resp.status_code == 200, resp.text
        write_token = resp.json()["token"]

        # Issue a read MCP token
        resp = client.post(
            "/api/auth/mcp-token",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert resp.status_code == 200, resp.text
        read_mcp_token = resp.json()["token"]

        yield client, access_token, write_token, read_mcp_token

        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


_VALID_PAYLOAD = {
    "amount": 1200,
    "date": "2026-05-31",
    "merchant": "Lawson Shibuya",
    "category": "Food",
    "is_income": False,
    "currency": "JPY",
}


def test_apply_scan_creates_transaction(client_and_tokens):
    """Access token can POST; response contains transaction_id; DB row has source='Receipt'."""
    client, access_token, write_token, _read = client_and_tokens

    resp = client.post(
        "/api/receipts/apply-scan",
        headers=_auth(access_token),
        json=_VALID_PAYLOAD,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "transaction_id" in body
    assert body["source"] == "Receipt"
    assert body["description"] == "Lawson Shibuya"
    assert body["amount"] == 1200
    assert body["date"] == "2026-05-31"
    assert body["category"] == "Food"
    assert body["is_income"] is False


def test_apply_scan_write_token_allowed(client_and_tokens):
    """Write token is accepted on /api/receipts/apply-scan (proves allowlist entry)."""
    client, _access, write_token, _read = client_and_tokens

    payload = {**_VALID_PAYLOAD, "merchant": "FamilyMart Aoyama", "date": "2026-05-30"}
    resp = client.post(
        "/api/receipts/apply-scan",
        headers=_auth(write_token),
        json=payload,
    )
    # Auth passed: not 401 or 403
    assert resp.status_code not in (401, 403), f"Got {resp.status_code}: {resp.text}"
    assert resp.status_code == 200
    assert resp.json()["source"] == "Receipt"


def test_apply_scan_read_token_blocked(client_and_tokens):
    """Read MCP token gets 403 with 'read-only' in detail."""
    client, _access, _write, read_mcp_token = client_and_tokens

    resp = client.post(
        "/api/receipts/apply-scan",
        headers=_auth(read_mcp_token),
        json=_VALID_PAYLOAD,
    )
    assert resp.status_code == 403, resp.text
    assert "read-only" in resp.json()["detail"].lower()


def test_apply_scan_bad_date_falls_back_to_today(client_and_tokens):
    """Invalid date string → endpoint falls back to today's date, returns 200."""
    client, access_token, _write, _read = client_and_tokens

    payload = {**_VALID_PAYLOAD, "date": "not-a-date", "merchant": "Test Bad Date"}
    resp = client.post(
        "/api/receipts/apply-scan",
        headers=_auth(access_token),
        json=payload,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # Date should be today (not the invalid string)
    returned_date = body["date"]
    today_str = date.today().isoformat()
    assert returned_date == today_str, f"Expected today {today_str}, got {returned_date}"
