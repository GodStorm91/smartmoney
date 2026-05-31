"""Tests for MCP write-token tier.

Guards the mcp_write token lifecycle, allowlist gating, revocation, and
regression safety for existing mcp read token + access token behavior.

Pattern mirrors test_mcp_token.py: TestClient + temp SQLite + dependency override.
"""
import io
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.utils import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models.transaction import Base
from app.models.user import User


@pytest.fixture(scope="module")
def client_and_token():
    """TestClient backed by a temp DB with one active user.

    Yields (client, access_token).
    """
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = Session()
        user = User(
            email="write@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add(user)
        db.commit()
        access_token = create_access_token(data={"sub": user.id})
        db.close()

        def override():
            s = Session()
            try:
                yield s
            finally:
                s.close()

        app.dependency_overrides[get_db] = override
        yield TestClient(app), access_token
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_write_token_lifecycle(client_and_token):
    """Issue → status enabled → revoke → status disabled."""
    client, access_token = client_and_token

    # Issue write token with access token.
    resp = client.post("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["expires_days"] == 30
    assert body["token"]

    # Status shows enabled.
    resp = client.get("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200
    assert resp.json()["enabled"] is True

    # Revoke.
    resp = client.delete("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 204

    # Status shows disabled.
    resp = client.get("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False


def test_write_token_allowed_endpoint(client_and_token):
    """Write token accepted on the allowlisted POST /api/upload/csv."""
    client, access_token = client_and_token

    # Issue a fresh write token.
    resp = client.post("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200
    write_token = resp.json()["token"]

    # POST to /api/upload/csv with a minimal (but valid-format) CSV.
    # The upload may return 4xx from the CSV parser; what matters is NOT 401/403.
    csv_content = b"date,description,amount,category,source\n2026-01-01,test,100,Food,bank\n"
    resp = client.post(
        "/api/upload/csv",
        headers=_auth(write_token),
        files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
    )
    # Auth passed: response is NOT 401 or 403.
    assert resp.status_code not in (401, 403), f"Got {resp.status_code}: {resp.text}"

    # Revoke after test.
    client.delete("/api/auth/mcp-write-token", headers=_auth(access_token))


def test_write_token_blocked_on_non_allowlisted_endpoint(client_and_token):
    """Write token gets 403 on endpoints not in WRITE_TOKEN_ALLOWLIST."""
    client, access_token = client_and_token

    # Issue write token.
    resp = client.post("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200
    write_token = resp.json()["token"]

    # Attempt a non-allowlisted endpoint (the mcp-token POST itself).
    resp = client.post("/api/auth/mcp-token", headers=_auth(write_token))
    assert resp.status_code == 403, resp.text
    assert "not allowed" in resp.json()["detail"].lower()

    # Revoke after test.
    client.delete("/api/auth/mcp-write-token", headers=_auth(access_token))


def test_write_token_blocked_when_revoked(client_and_token):
    """Revoked write token gets 401 on allowlisted endpoint."""
    client, access_token = client_and_token

    # Issue + immediately revoke.
    resp = client.post("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200
    write_token = resp.json()["token"]
    client.delete("/api/auth/mcp-write-token", headers=_auth(access_token))

    # Revoked token rejected even on the allowlisted endpoint.
    csv_content = b"date,description,amount\n2026-01-01,test,100\n"
    resp = client.post(
        "/api/upload/csv",
        headers=_auth(write_token),
        files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert resp.status_code == 401, resp.text


def test_read_mcp_token_still_403_on_writes_regression(client_and_token):
    """Existing mcp read token must still be blocked on all non-GET endpoints."""
    client, access_token = client_and_token

    # Issue the read mcp token.
    resp = client.post("/api/auth/mcp-token", headers=_auth(access_token))
    assert resp.status_code == 200
    mcp_token = resp.json()["token"]

    # Read token on write endpoint → 403 (read-only gate, not allowlist gate).
    csv_content = b"date,description,amount\n2026-01-01,test,100\n"
    resp = client.post(
        "/api/upload/csv",
        headers=_auth(mcp_token),
        files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert resp.status_code == 403, resp.text
    # Must mention read-only, not allowlist (different gate).
    assert "read-only" in resp.json()["detail"].lower()

    # Cleanup.
    client.delete("/api/auth/mcp-token", headers=_auth(access_token))


def test_access_token_unaffected_regression(client_and_token):
    """Access token must continue to work on GET and POST without restriction."""
    client, access_token = client_and_token

    # GET still works.
    assert client.get("/api/auth/me", headers=_auth(access_token)).status_code == 200

    # POST to mcp-write-token works (also verified in lifecycle test).
    resp = client.post("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200

    # Write token status endpoint works with access token.
    resp = client.get("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200
    assert "enabled" in resp.json()

    # Cleanup.
    client.delete("/api/auth/mcp-write-token", headers=_auth(access_token))
