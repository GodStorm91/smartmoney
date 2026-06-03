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
from app.models.crypto_wallet import (
    CryptoWallet,
    DefiPositionSnapshot,
    PositionCostBasis,
    PositionReward,
)
from app.models.position_closure import PositionClosure
from app.models.transaction import Base
from app.models.user import User

@pytest.fixture
def client_and_db():
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)

        db = Session()
        user_a = User(
            email="lp-pnl-a@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        user_b = User(
            email="lp-pnl-b@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add_all([user_a, user_b])
        db.flush()

        wallet_a = CryptoWallet(
            user_id=user_a.id,
            wallet_address="0x1111111111111111111111111111111111111111",
            label="Base LP wallet",
            chains=["base"],
        )
        wallet_b = CryptoWallet(
            user_id=user_b.id,
            wallet_address="0x2222222222222222222222222222222222222222",
            label="Other wallet",
            chains=["base"],
        )
        db.add_all([wallet_a, wallet_b])
        db.commit()

        access_token = create_access_token(data={"sub": user_a.id})
        user_ids = {"a": user_a.id, "b": user_b.id}
        wallet_ids = {"a": wallet_a.id, "b": wallet_b.id}
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


def _snapshot(session, user_id: int, wallet_address: str, position_id: str, value: str):
    session.add(
        DefiPositionSnapshot(
            user_id=user_id,
            wallet_address=wallet_address,
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


def _cost_basis(session, user_id: int, wallet_address: str, position_id: str, value: str):
    # Set derived_basis_usd alongside total_usd to match post-migration state.
    # Pre-fix code attributed legacy total_usd as manual; new attribution is derived.
    session.add(
        PositionCostBasis(
            user_id=user_id,
            position_id=position_id,
            wallet_address=wallet_address,
            chain_id="base",
            vault_address="0x9999999999999999999999999999999999999999",
            total_usd=Decimal(value),
            derived_basis_usd=Decimal(value),
            derived_at=datetime(2026, 5, 25, 9, 0, 0),
            deposited_at=datetime(2026, 5, 25, 9, 0, 0),
            tx_hash="0x" + position_id[-64:].rjust(64, "0"),
        )
    )


def _reward(session, user_id: int, wallet_address: str, position_id: str, value: str):
    session.add(
        PositionReward(
            user_id=user_id,
            position_id=position_id,
            wallet_address=wallet_address,
            chain_id="base",
            reward_token_address="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            reward_token_symbol="AERO",
            reward_amount=Decimal("10"),
            reward_usd=Decimal(value),
            claimed_at=datetime(2026, 6, 1, 9, 0, 0),
            tx_hash="0x" + f"{position_id}-reward"[-64:].rjust(64, "0"),
            source="merkl",
            is_attributed=True,
        )
    )


def test_lp_real_pnl_returns_full_partial_and_closed_rows(client_and_db):
    client, Session, access_token, user_ids, wallet_ids = client_and_db
    session = Session()
    try:
        wallet = "0x1111111111111111111111111111111111111111"
        _snapshot(session, user_ids["a"], wallet, "open-full", "900.00")
        _cost_basis(session, user_ids["a"], wallet, "open-full", "800.00")
        _cost_basis(session, user_ids["a"], wallet, "open-full", "50.00")
        _reward(session, user_ids["a"], wallet, "open-full", "25.00")
        _snapshot(session, user_ids["a"], wallet, "open-partial", "1000.00")
        _reward(session, user_ids["a"], wallet, "open-partial", "20.00")
        session.add(
            PositionClosure(
                user_id=user_ids["a"],
                position_id="closed-full",
                wallet_address=wallet,
                chain_id="base",
                protocol="Algebra",
                symbol="WETH/AAVE",
                exit_date=datetime(2026, 6, 2, 12, 0, 0),
                exit_value_usd=Decimal("1100.00"),
                exit_value_jpy=170000,
                cost_basis_usd=Decimal("1000.00"),
                total_rewards_usd=Decimal("10.00"),
                realized_pnl_usd=Decimal("110.00"),
            )
        )
        session.commit()
    finally:
        session.close()

    resp = client.get(
        "/api/crypto/lp-real-pnl",
        params={"wallet_id": wallet_ids["a"]},
        headers=_auth(access_token),
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    positions = {item["position_id"]: item for item in body["positions"]}

    assert positions["open-full"]["data_completeness"] == "full"
    assert Decimal(str(positions["open-full"]["real_pnl_usd"])) == Decimal("75.00")
    assert positions["open-partial"]["data_completeness"] == "partial"
    assert positions["open-partial"]["real_pnl_usd"] is None
    assert positions["open-partial"]["missing"] == ["cost_basis_usd"]
    assert positions["closed-full"]["status"] == "closed"
    assert Decimal(str(positions["closed-full"]["real_pnl_usd"])) == Decimal("110.00")
    assert body["full_positions"] == 2
    assert body["partial_positions"] == 1
    assert Decimal(str(body["known_total_rewards_usd"])) == Decimal("55.00")
    assert Decimal(str(body["known_total_real_pnl_usd"])) == Decimal("185.00")

def test_lp_real_pnl_rejects_other_users_wallet(client_and_db):
    client, _, access_token, _, wallet_ids = client_and_db

    resp = client.get(
        "/api/crypto/lp-real-pnl",
        params={"wallet_id": wallet_ids["b"]},
        headers=_auth(access_token),
    )

    assert resp.status_code == 404, resp.text
