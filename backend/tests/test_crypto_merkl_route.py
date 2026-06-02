"""Tests for the MCP-facing Merkl rewards crypto route."""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.utils import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models.crypto_wallet import CryptoWallet
from app.models.transaction import Base
from app.models.user import User
from app.routes import crypto as crypto_routes


@pytest.fixture
def client_and_wallet():
    """TestClient backed by a temp DB seeded with one user and one wallet."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)

        db = Session()
        user = User(
            email="crypto-merkl@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add(user)
        db.flush()
        wallet = CryptoWallet(
            user_id=user.id,
            wallet_address="0x1111111111111111111111111111111111111111",
            label="Base LP wallet",
            chains=["polygon"],
        )
        db.add(wallet)
        db.commit()
        access_token = create_access_token(data={"sub": user.id})
        wallet_id = wallet.id
        db.close()

        def override():
            session = Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override
        yield TestClient(app), access_token, wallet_id
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_merkl_route_returns_parsed_rewards(client_and_wallet, monkeypatch):
    client, access_token, wallet_id = client_and_wallet
    canned = {
        "tokens": [
            {
                "chain_id": "8453",
                "token_address": "0x2222222222222222222222222222222222222222",
                "symbol": "AERO",
                "pending": "12.5",
                "breakdowns": [{"campaign_id": "campaign-1"}],
            }
        ]
    }
    calls = {}

    async def fake_get_user_rewards(wallet_address: str, chain: str = "polygon") -> dict:
        calls["wallet_address"] = wallet_address
        calls["chain"] = chain
        return canned

    monkeypatch.setattr(
        crypto_routes.MerklService,
        "get_user_rewards",
        staticmethod(fake_get_user_rewards),
    )

    resp = client.get(
        f"/api/crypto/wallets/{wallet_id}/merkl-rewards",
        headers=_auth(access_token),
    )

    assert resp.status_code == 200, resp.text
    assert calls == {
        "wallet_address": "0x1111111111111111111111111111111111111111",
        "chain": "base",
    }
    assert resp.json() == {
        **canned,
        "chain": "base",
        "wallet_address": "0x1111111111111111111111111111111111111111",
    }


def test_merkl_route_validates_chain(client_and_wallet):
    client, access_token, wallet_id = client_and_wallet

    resp = client.get(
        f"/api/crypto/wallets/{wallet_id}/merkl-rewards",
        params={"chain": "ethereum"},
        headers=_auth(access_token),
    )

    assert resp.status_code == 400, resp.text
    detail = resp.json()["detail"]
    assert detail["invalid_chain"] == "ethereum"
    assert "base" in detail["valid_chains"]
    assert "polygon" in detail["valid_chains"]


def test_merkl_route_404_on_unknown_wallet(client_and_wallet):
    client, access_token, _ = client_and_wallet

    resp = client.get(
        "/api/crypto/wallets/999999/merkl-rewards",
        headers=_auth(access_token),
    )

    assert resp.status_code == 404, resp.text
