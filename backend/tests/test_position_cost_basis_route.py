import os
import tempfile
from datetime import datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.utils import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models.crypto_wallet import DefiPositionSnapshot
from app.models.transaction import Base
from app.models.user import User

WALLET = "0x1111111111111111111111111111111111111111"


@pytest.fixture
def client_context():
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = Session()
        user_a = User(
            email="basis-route-a@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        user_b = User(
            email="basis-route-b@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add_all([user_a, user_b])
        db.commit()
        access_token = create_access_token(data={"sub": user_a.id})
        user_ids = {"a": user_a.id, "b": user_b.id}
        db.close()

        def override():
            session = Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override
        yield TestClient(app), Session, access_token, user_ids
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _snapshot(session, user_id: int, position_id: str, value: str):
    session.add(
        DefiPositionSnapshot(
            user_id=user_id,
            wallet_address=WALLET,
            position_id=position_id,
            protocol="Algebra",
            chain_id="base",
            position_type="liquidity",
            symbol="WETH/AAVE",
            balance=Decimal("1"),
            balance_usd=Decimal(value),
            snapshot_date=datetime(2026, 6, 2, 9, 0, 0),
        )
    )


def _write_token(client: TestClient, access_token: str) -> str:
    resp = client.post("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def test_set_position_cost_basis_accepts_write_token_and_updates_lp_pnl(client_context):
    client, Session, access_token, user_ids = client_context
    session = Session()
    try:
        _snapshot(session, user_ids["a"], "lp-manual", "1200.00")
        session.commit()
    finally:
        session.close()

    resp = client.put(
        "/api/crypto/positions/cost-basis",
        headers=_auth(_write_token(client, access_token)),
        json={
            "position_id": "lp-manual",
            "manual_basis_usd": "1500.25",
            "note": "tx-by-tx reconciliation",
        },
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert Decimal(str(body["effective_basis_usd"])) == Decimal("1500.25")
    assert body["basis_source"] == "manual"
    assert body["note"] == "tx-by-tx reconciliation"

    pnl = client.get("/api/crypto/lp-real-pnl", headers=_auth(access_token)).json()
    row = next(item for item in pnl["positions"] if item["position_id"] == "lp-manual")
    assert row["basis_source"] == "manual"
    assert Decimal(str(row["real_pnl_usd"])) == Decimal("-300.25")


def test_clear_manual_basis_falls_back_to_derived_basis(client_context):
    client, Session, access_token, user_ids = client_context
    session = Session()
    try:
        _snapshot(session, user_ids["a"], "lp-clear", "900.00")
        session.commit()
    finally:
        session.close()

    client.put(
        "/api/crypto/positions/cost-basis",
        headers=_auth(access_token),
        json={"position_id": "lp-clear", "manual_basis_usd": "1000.00"},
    )
    resp = client.put(
        "/api/crypto/positions/cost-basis",
        headers=_auth(access_token),
        json={"position_id": "lp-clear", "manual_basis_usd": None},
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["manual_basis_usd"] is None
    assert Decimal(str(body["effective_basis_usd"])) == Decimal("900.00")
    assert body["basis_source"] == "derived"


def test_set_position_cost_basis_is_user_isolated(client_context):
    client, Session, access_token, user_ids = client_context
    session = Session()
    try:
        _snapshot(session, user_ids["b"], "other-user-lp", "100.00")
        session.commit()
    finally:
        session.close()

    resp = client.put(
        "/api/crypto/positions/cost-basis",
        headers=_auth(access_token),
        json={"position_id": "other-user-lp", "manual_basis_usd": "1.00"},
    )

    assert resp.status_code == 422, resp.text
    assert "unknown position_id" in resp.json()["detail"]


def test_read_mcp_token_cannot_set_position_cost_basis(client_context):
    client, Session, access_token, user_ids = client_context
    session = Session()
    try:
        _snapshot(session, user_ids["a"], "lp-read-token", "100.00")
        session.commit()
    finally:
        session.close()

    token_resp = client.post("/api/auth/mcp-token", headers=_auth(access_token))
    assert token_resp.status_code == 200, token_resp.text
    resp = client.put(
        "/api/crypto/positions/cost-basis",
        headers=_auth(token_resp.json()["token"]),
        json={"position_id": "lp-read-token", "manual_basis_usd": "1.00"},
    )

    assert resp.status_code == 403, resp.text
    assert "read-only" in resp.json()["detail"].lower()
