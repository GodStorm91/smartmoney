"""Tests for MCP-facing closed-position realized P&L route."""
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
from app.models.crypto_wallet import CryptoWallet
from app.models.position_closure import PositionClosure
from app.models.transaction import Base
from app.models.user import User


@pytest.fixture
def client_and_db():
    """TestClient backed by a temp DB with two users and two wallets."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)

        db = Session()
        user_a = User(
            email="closed-a@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        user_b = User(
            email="closed-b@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add_all([user_a, user_b])
        db.flush()

        wallet_a1 = CryptoWallet(
            user_id=user_a.id,
            wallet_address="0x1111111111111111111111111111111111111111",
            label="LP wallet 1",
            chains=["polygon"],
        )
        wallet_a2 = CryptoWallet(
            user_id=user_a.id,
            wallet_address="0x2222222222222222222222222222222222222222",
            label="LP wallet 2",
            chains=["polygon"],
        )
        wallet_b = CryptoWallet(
            user_id=user_b.id,
            wallet_address="0x3333333333333333333333333333333333333333",
            label="Other user wallet",
            chains=["polygon"],
        )
        db.add_all([wallet_a1, wallet_a2, wallet_b])
        db.commit()

        access_token = create_access_token(data={"sub": user_a.id})
        user_ids = {"a": user_a.id, "b": user_b.id}
        wallet_ids = {"a1": wallet_a1.id, "a2": wallet_a2.id, "b": wallet_b.id}
        db.close()

        def override():
            session = Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override
        yield TestClient(app), Session, access_token, user_ids, wallet_ids
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _add_closure(
    session,
    *,
    user_id: int,
    wallet_address: str,
    position_id: str,
    cost_basis_usd: Decimal | None,
    exit_date: datetime,
) -> None:
    session.add(
        PositionClosure(
            user_id=user_id,
            position_id=position_id,
            wallet_address=wallet_address,
            chain_id="polygon",
            protocol="QuickSwap",
            symbol="QUICK/USDC",
            exit_date=exit_date,
            exit_value_usd=Decimal("1250.00"),
            exit_value_jpy=190000,
            cost_basis_usd=cost_basis_usd,
            total_rewards_usd=Decimal("25.00"),
            realized_pnl_usd=Decimal("275.00") if cost_basis_usd is not None else None,
            realized_pnl_jpy=42000 if cost_basis_usd is not None else None,
            exit_tx_hash="0x" + position_id[-64:].rjust(64, "0"),
            note=f"closed {position_id}",
        )
    )


def test_closed_positions_returns_user_closures_only(client_and_db):
    client, Session, access_token, user_ids, _ = client_and_db
    session = Session()
    try:
        _add_closure(
            session,
            user_id=user_ids["a"],
            wallet_address="0x1111111111111111111111111111111111111111",
            position_id="pos-a-new",
            cost_basis_usd=Decimal("1000.00"),
            exit_date=datetime(2026, 6, 2, 12, 0, 0),
        )
        _add_closure(
            session,
            user_id=user_ids["a"],
            wallet_address="0x2222222222222222222222222222222222222222",
            position_id="pos-a-old",
            cost_basis_usd=Decimal("900.00"),
            exit_date=datetime(2026, 5, 1, 12, 0, 0),
        )
        _add_closure(
            session,
            user_id=user_ids["b"],
            wallet_address="0x3333333333333333333333333333333333333333",
            position_id="pos-b-hidden",
            cost_basis_usd=Decimal("800.00"),
            exit_date=datetime(2026, 6, 1, 12, 0, 0),
        )
        session.commit()
    finally:
        session.close()

    resp = client.get("/api/crypto/closed-positions", headers=_auth(access_token))

    assert resp.status_code == 200, resp.text
    position_ids = [item["position_id"] for item in resp.json()]
    assert position_ids == ["pos-a-new", "pos-a-old"]
    assert "pos-b-hidden" not in position_ids


def test_closed_positions_filters_by_wallet_id(client_and_db):
    client, Session, access_token, user_ids, wallet_ids = client_and_db
    session = Session()
    try:
        _add_closure(
            session,
            user_id=user_ids["a"],
            wallet_address="0x1111111111111111111111111111111111111111",
            position_id="wallet-one-position",
            cost_basis_usd=Decimal("1000.00"),
            exit_date=datetime(2026, 6, 2, 12, 0, 0),
        )
        _add_closure(
            session,
            user_id=user_ids["a"],
            wallet_address="0x2222222222222222222222222222222222222222",
            position_id="wallet-two-position",
            cost_basis_usd=Decimal("900.00"),
            exit_date=datetime(2026, 6, 1, 12, 0, 0),
        )
        session.commit()
    finally:
        session.close()

    resp = client.get(
        "/api/crypto/closed-positions",
        params={"wallet_id": wallet_ids["a1"]},
        headers=_auth(access_token),
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert [item["position_id"] for item in body] == ["wallet-one-position"]

    other_wallet_resp = client.get(
        "/api/crypto/closed-positions",
        params={"wallet_id": wallet_ids["b"]},
        headers=_auth(access_token),
    )
    assert other_wallet_resp.status_code == 404, other_wallet_resp.text


def test_closed_positions_marks_data_completeness(client_and_db):
    client, Session, access_token, user_ids, _ = client_and_db
    session = Session()
    try:
        _add_closure(
            session,
            user_id=user_ids["a"],
            wallet_address="0x1111111111111111111111111111111111111111",
            position_id="full-position",
            cost_basis_usd=Decimal("1000.00"),
            exit_date=datetime(2026, 6, 2, 12, 0, 0),
        )
        _add_closure(
            session,
            user_id=user_ids["a"],
            wallet_address="0x1111111111111111111111111111111111111111",
            position_id="partial-position",
            cost_basis_usd=None,
            exit_date=datetime(2026, 6, 1, 12, 0, 0),
        )
        session.commit()
    finally:
        session.close()

    resp = client.get("/api/crypto/closed-positions", headers=_auth(access_token))

    assert resp.status_code == 200, resp.text
    completeness = {item["position_id"]: item["data_completeness"] for item in resp.json()}
    assert completeness["full-position"] == "full"
    assert completeness["partial-position"] == "partial"
