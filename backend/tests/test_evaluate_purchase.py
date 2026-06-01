"""Tests for GET /api/budgets/evaluate-purchase.

Fixture pattern: TestClient + temp SQLite + seed user (mirrors test_mcp_token.py).
Seed data: active budget for current month with Food=50000 allocation,
plus transactions totalling 38000 in Food this month, plus some older
transactions for 3-month average.
"""
import calendar
import hashlib
import os
import tempfile
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.utils import create_access_token, hash_password
from app.database import get_db
from app.main import app
from app.models.budget import Budget, BudgetAllocation
from app.models.transaction import Base, Transaction
from app.models.user import User


def _today():
    return date.today()


def _current_month():
    return _today().strftime("%Y-%m")


def _make_tx(user_id: int, tx_date: date, amount: int, category: str, label: str) -> Transaction:
    """Build a JPY expense Transaction with required non-null fields."""
    month_key = tx_date.strftime("%Y-%m")
    # Unique hash: blend all distinguishing fields
    raw = f"{user_id}|{tx_date}|{amount}|{category}|{label}"
    tx_hash = hashlib.sha256(raw.encode()).hexdigest()
    return Transaction(
        user_id=user_id,
        date=tx_date,
        month_key=month_key,
        tx_hash=tx_hash,
        amount=amount,
        category=category,
        description=label,
        currency="JPY",
        source="manual",
        is_income=False,
        is_transfer=False,
        is_adjustment=False,
        exclude_from_budget=False,
    )


@pytest.fixture(scope="module")
def client_and_token():
    """TestClient backed by a temp DB seeded with one user + budget + transactions.

    Budget: Food=50000 for current month.
    Transactions (this month, Food): total 38000 (remaining_before = 12000).
    Transactions (prior 90 days, Food): 60000 more for 3-month avg.
    """
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        db = Session()

        # Seed user
        user = User(
            email="eval@example.com",
            hashed_password=hash_password("x"),
            is_active=True,
        )
        db.add(user)
        db.flush()

        today = _today()
        current_month = today.strftime("%Y-%m")
        year, month_num = today.year, today.month
        month_start = date(year, month_num, 1)

        # Seed budget with Food allocation (50000) for current month
        budget = Budget(
            user_id=user.id,
            month=current_month,
            monthly_income=300000,
            is_active=True,
        )
        db.add(budget)
        db.flush()

        food_alloc = BudgetAllocation(
            budget_id=budget.id,
            category="Food",
            amount=50000,
        )
        db.add(food_alloc)

        # This-month Food transactions: total 38000 spent
        # (remaining_before = 50000 - 38000 = 12000)
        for i, amount in enumerate([15000, 13000, 10000]):
            db.add(_make_tx(user.id, month_start, -amount, "Food", f"food-cur-{i}"))

        # Prior-month Food transactions (for 3-month avg)
        # Seeded at today - 45 days (within 90-day window, outside current month)
        prior_date = today - timedelta(days=45)
        for i, amount in enumerate([20000, 25000, 15000]):  # total 60000
            db.add(_make_tx(user.id, prior_date, -amount, "Food", f"food-prior-{i}"))

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
        yield TestClient(app), access_token, user.id
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_go_verdict_within_budget(client_and_token):
    """Verify response shape and that go/tight verdict is determined by the heuristic.

    price=1500, remaining_after=10500. Whether verdict is "go" or "tight" depends
    on days remaining vs 3-month avg — we verify the math is consistent rather than
    hardcoding a verdict that flips based on test-run date.
    """
    client, token, _ = client_and_token
    resp = client.get(
        "/api/budgets/evaluate-purchase",
        params={"price": 1500, "category": "Food", "item_name": "Lunch"},
        headers=_auth(token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()

    # Response shape
    assert body["allocated"] == 50000
    assert body["spent_so_far"] == 38000
    assert body["remaining_before"] == 12000
    assert body["remaining_after"] == 10500
    assert body["price"] == 1500
    assert body["category"] == "Food"
    assert body["item_name"] == "Lunch"
    assert body["days_until_month_end"] >= 1
    assert "reasoning" in body
    assert body["three_month_avg_in_category"] >= 0

    # Verdict must be one of the valid non-stop, non-unknown values (remaining_after > 0,
    # allocation exists) — could be go or tight depending on days remaining
    assert body["verdict"] in ("go", "tight"), f"Unexpected verdict: {body['verdict']}"

    # Verify verdict matches the heuristic: go iff remaining_after >= threshold
    three_month_avg = body["three_month_avg_in_category"]
    days = body["days_until_month_end"]
    threshold = (three_month_avg / 30.0) * days * 0.5
    if body["remaining_after"] >= threshold:
        assert body["verdict"] == "go"
    else:
        assert body["verdict"] == "tight"


def test_stop_verdict_over_budget(client_and_token):
    """price=20000 > remaining_before(12000) — expect verdict=stop, remaining_after=-8000."""
    client, token, _ = client_and_token
    resp = client.get(
        "/api/budgets/evaluate-purchase",
        params={"price": 20000, "category": "Food"},
        headers=_auth(token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["verdict"] == "stop"
    assert body["remaining_after"] == -8000
    assert "Over budget" in body["reasoning"]


def test_tight_verdict_pace_warning(client_and_token):
    """price=11000 leaves only 1000 for rest of month — expect verdict=tight.

    remaining_after = 12000 - 11000 = 1000.
    The tight threshold = (3mo_avg/30) * days * 0.5; with substantial avg and
    many days left, 1000 should fall below threshold.
    """
    client, token, _ = client_and_token
    today = date.today()
    year, month_num = today.year, today.month
    last_day = calendar.monthrange(year, month_num)[1]
    days_left = (date(year, month_num, last_day) - today).days + 1

    # 3-month avg covers: 38000 (this month) + 60000 (prior seeded) = 98000 total in 90 days
    # three_month_avg = 98000 // 3 ≈ 32666
    # tight_threshold = (32666/30) * days_left * 0.5
    # For most days of month, threshold >> 1000, so verdict = tight
    # (unless we're at the last day of month — safe to skip there)
    if days_left <= 1:
        pytest.skip("Last day of month; tight threshold too small to test reliably")

    resp = client.get(
        "/api/budgets/evaluate-purchase",
        params={"price": 11000, "category": "Food"},
        headers=_auth(token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["remaining_after"] == 1000
    # Could be tight or go depending on the exact threshold; check the math
    three_month_avg = body["three_month_avg_in_category"]
    daily_pace = three_month_avg / 30.0
    threshold = daily_pace * days_left * 0.5
    if threshold > 1000:
        assert body["verdict"] == "tight"
    else:
        assert body["verdict"] in ("go", "tight")


def test_unknown_when_no_allocation_for_category(client_and_token):
    """category=Travel has no allocation — verdict=unknown, 3mo_avg still returned."""
    client, token, _ = client_and_token
    resp = client.get(
        "/api/budgets/evaluate-purchase",
        params={"price": 5000, "category": "Travel"},
        headers=_auth(token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["verdict"] == "unknown"
    assert body["allocated"] == 0
    assert body["spent_so_far"] == 0
    assert "three_month_avg_in_category" in body
    assert "No budget set" in body["reasoning"]


def test_no_budget_at_all_returns_unknown(client_and_token):
    """User with no budget seeded → verdict=unknown, graceful fallback.

    Uses a second user added to the module fixture's DB (no budget for that user).
    """
    client, _, _ = client_and_token

    # Create a separate engine/db for the no-budget user to keep isolation clean
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    engine2 = create_engine(f"sqlite:///{db_path}")
    Session2 = sessionmaker(autocommit=False, autoflush=False, bind=engine2)
    Base.metadata.create_all(bind=engine2)
    db2 = Session2()
    user2 = User(
        email="no_budget@example.com",
        hashed_password=hash_password("x"),
        is_active=True,
    )
    db2.add(user2)
    db2.commit()
    token2 = create_access_token(data={"sub": user2.id})
    db2.close()

    # Save and restore the module fixture's override
    saved_override = app.dependency_overrides.get(get_db)

    def override2():
        s = Session2()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override2
    try:
        client2 = TestClient(app)
        resp = client2.get(
            "/api/budgets/evaluate-purchase",
            params={"price": 3000, "category": "Food"},
            headers=_auth(token2),
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["verdict"] == "unknown"
        assert body["allocated"] == 0
        assert body["spent_so_far"] == 0
    finally:
        # Restore module fixture override (not clear — that would break subsequent tests)
        if saved_override is not None:
            app.dependency_overrides[get_db] = saved_override
        else:
            app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine2)
        engine2.dispose()
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_invalid_price_returns_422(client_and_token):
    """price=0 and price=-100 are rejected with 422 Unprocessable Entity."""
    client, token, _ = client_and_token
    for bad_price in [0, -100]:
        resp = client.get(
            "/api/budgets/evaluate-purchase",
            params={"price": bad_price, "category": "Food"},
            headers=_auth(token),
        )
        assert resp.status_code == 422, f"Expected 422 for price={bad_price}, got {resp.status_code}"
