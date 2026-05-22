"""Tests for MCP (OpenClaw) token lifecycle + the shared get_current_user change.

Critically guards the dependencies.py edit: relaxing get_current_user to accept
mcp tokens must NOT break the access-token path (any method) and mcp tokens MUST
be read-only (403 on writes) + revocable (401 after revoke).
"""
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
    """TestClient backed by a temp DB seeded with one active user.

    Returns (client, access_token) — access_token is the user's normal web token.
    """
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = Session()
        user = User(email="mcp@example.com", hashed_password=hash_password("x"), is_active=True)
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


def test_mcp_token_full_lifecycle(client_and_token):
    client, access_token = client_and_token

    # 1. Issue MCP token using the ACCESS token (also asserts access token works on POST).
    resp = client.post("/api/auth/mcp-token", headers=_auth(access_token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["expires_days"] == 365
    mcp_token = body["token"]
    assert mcp_token

    # 2. MCP token can READ a protected GET endpoint.
    resp = client.get("/api/auth/me", headers=_auth(mcp_token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == "mcp@example.com"

    # 3. MCP token is READ-ONLY: POST is forbidden (403).
    resp = client.post("/api/auth/mcp-token", headers=_auth(mcp_token))
    assert resp.status_code == 403, resp.text

    # 4. Revoke via the access token.
    resp = client.delete("/api/auth/mcp-token", headers=_auth(access_token))
    assert resp.status_code == 204, resp.text

    # 5. Revoked MCP token is rejected (401) even on a GET.
    resp = client.get("/api/auth/me", headers=_auth(mcp_token))
    assert resp.status_code == 401, resp.text


def test_access_token_unaffected_regression(client_and_token):
    """The shared dependency change must not break normal access tokens."""
    client, access_token = client_and_token
    # GET works.
    assert client.get("/api/auth/me", headers=_auth(access_token)).status_code == 200
    # Status endpoint reflects no active token initially (or after prior revoke).
    resp = client.get("/api/auth/mcp-token", headers=_auth(access_token))
    assert resp.status_code == 200
    assert "enabled" in resp.json()


def test_mcp_token_status_roundtrip(client_and_token):
    client, access_token = client_and_token
    # Issue → status enabled.
    client.post("/api/auth/mcp-token", headers=_auth(access_token))
    status_resp = client.get("/api/auth/mcp-token", headers=_auth(access_token))
    assert status_resp.json()["enabled"] is True
    # Revoke → status disabled.
    client.delete("/api/auth/mcp-token", headers=_auth(access_token))
    status_resp = client.get("/api/auth/mcp-token", headers=_auth(access_token))
    assert status_resp.json()["enabled"] is False
