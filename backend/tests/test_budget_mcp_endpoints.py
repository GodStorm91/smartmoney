"""Tests for MCP-facing budget preview and bulk allocation endpoints."""
import os
import tempfile
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.utils import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models.budget import Budget, BudgetAllocation
from app.models.category import Category
from app.models.credit_transaction import CreditTransaction  # noqa: F401
from app.models.transaction import Base
from app.models.user import User
from app.models.user_credit import UserCredit
from app.routes import budgets as budget_routes


class _FakeClaudeAIService:
    def generate_budget_with_tracking(self, **kwargs):
        return (
            {
                "allocations": [
                    {"category": "Food", "amount": 50000, "reasoning": "keep steady"},
                    {"category": "Transport", "amount": 20000, "reasoning": "commute"},
                ],
                "advice": "Preview only",
            },
            {"input_tokens": 1000, "output_tokens": 500},
        )


@pytest.fixture
def client_and_db(monkeypatch):
    """TestClient backed by a fresh temp DB seeded with one active user."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)

        db = Session()
        user = User(
            email="budget-mcp@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add(user)
        db.flush()
        db.add_all([
            Category(name="Food", icon="F", type="expense", is_system=True),
            Category(name="Transport", icon="T", type="expense", is_system=True),
            UserCredit(user_id=user.id, balance=Decimal("10.0000")),
        ])
        db.commit()
        access_token = create_access_token(data={"sub": user.id})
        db.close()

        def override():
            session = Session()
            try:
                yield session
            finally:
                session.close()

        monkeypatch.setattr(budget_routes, "ClaudeAIService", _FakeClaudeAIService)
        app.dependency_overrides[get_db] = override
        yield TestClient(app), Session, access_token, user.id
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _seed_budget(Session, user_id: int) -> int:
    session = Session()
    try:
        budget = Budget(
            user_id=user_id,
            month=date.today().strftime("%Y-%m"),
            monthly_income=400000,
            is_active=True,
        )
        session.add(budget)
        session.flush()
        session.add_all([
            BudgetAllocation(budget_id=budget.id, category="Food", amount=30000),
            BudgetAllocation(budget_id=budget.id, category="Transport", amount=10000),
        ])
        session.commit()
        return budget.id
    finally:
        session.close()


def test_generate_preview_returns_proposal_without_saving(client_and_db):
    client, Session, access_token, user_id = client_and_db

    resp = client.post(
        "/api/budgets/generate-preview",
        headers=_auth(access_token),
        json={"monthly_income": 400000, "feedback": "more transit", "language": "en"},
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["monthly_income"] == 400000
    assert body["reasoning"] == "Preview only"
    assert body["allocations"][0]["category"] == "Food"

    session = Session()
    try:
        assert session.query(Budget).filter(Budget.user_id == user_id).count() == 0
    finally:
        session.close()


def test_write_token_can_use_budget_allowlisted_endpoints(client_and_db):
    client, _, access_token, _ = client_and_db

    token_resp = client.post("/api/auth/mcp-write-token", headers=_auth(access_token))
    assert token_resp.status_code == 200, token_resp.text
    write_token = token_resp.json()["token"]

    preview_resp = client.post(
        "/api/budgets/generate-preview",
        headers=_auth(write_token),
        json={"monthly_income": 400000},
    )
    assert preview_resp.status_code == 200, preview_resp.text

    patch_resp = client.patch(
        "/api/budgets/current/allocations",
        headers=_auth(write_token),
        json={"allocations": [{"category": "Food", "amount": 50000}]},
    )
    assert patch_resp.status_code == 200, patch_resp.text
    assert patch_resp.json()["was_created"] is True


def test_set_allocations_patches_existing_budget(client_and_db):
    client, Session, access_token, user_id = client_and_db
    budget_id = _seed_budget(Session, user_id)

    resp = client.patch(
        "/api/budgets/current/allocations",
        headers=_auth(access_token),
        json={"allocations": [{"category": "Food", "amount": 50000}]},
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == budget_id
    assert body["was_created"] is False
    amounts = {item["category"]: item["amount"] for item in body["allocations"]}
    assert amounts["Food"] == 50000
    assert amounts["Transport"] == 10000


def test_set_allocations_creates_budget_when_missing(client_and_db):
    client, Session, access_token, user_id = client_and_db

    resp = client.patch(
        "/api/budgets/current/allocations",
        headers=_auth(access_token),
        json={"allocations": [{"category": "Food", "amount": 50000}]},
    )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["was_created"] is True
    assert body["monthly_income"] == 0
    assert body["allocations"] == [{"category": "Food", "amount": 50000, "reasoning": None}]

    session = Session()
    try:
        assert session.query(Budget).filter(Budget.user_id == user_id).count() == 1
        assert session.query(BudgetAllocation).count() == 1
    finally:
        session.close()


def test_set_allocations_rejects_unknown_category(client_and_db):
    client, Session, access_token, user_id = client_and_db

    resp = client.patch(
        "/api/budgets/current/allocations",
        headers=_auth(access_token),
        json={"allocations": [{"category": "NotARealCategory", "amount": 5000}]},
    )

    assert resp.status_code == 422, resp.text
    assert "NotARealCategory" in str(resp.json()["detail"])

    session = Session()
    try:
        assert session.query(Budget).filter(Budget.user_id == user_id).count() == 0
        assert session.query(BudgetAllocation).count() == 0
    finally:
        session.close()


def test_set_allocations_atomic_on_mixed_validity(client_and_db):
    client, Session, access_token, user_id = client_and_db
    _seed_budget(Session, user_id)

    resp = client.patch(
        "/api/budgets/current/allocations",
        headers=_auth(access_token),
        json={
            "allocations": [
                {"category": "Food", "amount": 50000},
                {"category": "NotReal", "amount": 1000},
            ]
        },
    )

    assert resp.status_code == 422, resp.text

    session = Session()
    try:
        food = (
            session.query(BudgetAllocation)
            .filter(BudgetAllocation.category == "Food")
            .one()
        )
        assert food.amount == 30000
    finally:
        session.close()
