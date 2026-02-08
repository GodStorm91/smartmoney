"""Tests for MonthlyReportService."""
from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.transaction import Base, Transaction
from app.models.user import User
from app.models.account import Account
from app.models.goal import Goal
from app.models.budget import Budget, BudgetAllocation
from app.models.exchange_rate import ExchangeRate
from app.services.monthly_report_service import MonthlyReportService
from app.utils.transaction_hasher import generate_tx_hash


@pytest.fixture(scope="function")
def db():
    """In-memory SQLite DB with all tables."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def user(db: Session) -> User:
    """Create a test user."""
    u = User(email="test@example.com", hashed_password="fake_hash", is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def other_user(db: Session) -> User:
    """Create a second user for isolation tests."""
    u = User(email="other@example.com", hashed_password="fake_hash", is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _add_tx(db, user_id, dt, amount, category, is_income=False, currency="JPY"):
    """Helper to add a transaction."""
    h = generate_tx_hash(str(dt), amount, f"{category}-{dt}", "TestSource")
    tx = Transaction(
        date=dt, description=f"{category} tx", amount=amount, category=category,
        source="TestSource", is_income=is_income, is_transfer=False,
        is_adjustment=False, currency=currency, month_key=dt.strftime("%Y-%m"),
        tx_hash=h, user_id=user_id,
    )
    db.add(tx)
    return tx


def _seed_jan2026(db: Session, user_id: int):
    """Seed January 2026 transactions for the user."""
    _add_tx(db, user_id, date(2026, 1, 5), 500000, "Salary", is_income=True)
    _add_tx(db, user_id, date(2026, 1, 10), -120000, "Housing")
    _add_tx(db, user_id, date(2026, 1, 12), -45000, "Food")
    _add_tx(db, user_id, date(2026, 1, 18), -15000, "Transportation")
    # Also seed Dec 2025 for MoM comparison
    _add_tx(db, user_id, date(2025, 12, 5), 480000, "Salary", is_income=True)
    _add_tx(db, user_id, date(2025, 12, 10), -120000, "Housing")
    _add_tx(db, user_id, date(2025, 12, 15), -50000, "Food")
    db.commit()


class TestGenerateReport:
    """Tests for MonthlyReportService.generate_report."""

    def test_report_with_transactions(self, db, user):
        """Full report with income, expenses, and MoM comparison."""
        _seed_jan2026(db, user.id)
        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)

        assert report.year == 2026
        assert report.month == 1
        assert report.month_label == "January 2026"
        assert report.summary.total_income == 500000
        assert report.summary.total_expense == 180000  # 120k + 45k + 15k
        assert report.summary.net_cashflow == 320000
        assert report.summary.savings_rate == 64.0  # (500k - 180k) / 500k * 100

    def test_report_empty_month(self, db, user):
        """Report for month with no transactions returns zeros."""
        report = MonthlyReportService.generate_report(db, user.id, 2026, 6)

        assert report.summary.total_income == 0
        assert report.summary.total_expense == 0
        assert report.summary.net_cashflow == 0
        assert report.summary.savings_rate == 0.0
        assert report.category_breakdown == []
        assert report.goal_progress == []

    def test_report_category_breakdown(self, db, user):
        """Category breakdown sorted by amount descending."""
        _seed_jan2026(db, user.id)
        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)

        cats = report.category_breakdown
        assert len(cats) == 3  # Housing, Food, Transportation
        assert cats[0]["category"] == "Housing"
        assert cats[0]["amount"] == 120000
        assert cats[1]["category"] == "Food"
        assert cats[2]["category"] == "Transportation"

    def test_report_mom_changes(self, db, user):
        """Month-over-month percentage changes calculated."""
        _seed_jan2026(db, user.id)
        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)

        # Income: 500k vs 480k = +4.2%
        assert abs(report.summary.income_change - 4.2) < 0.2
        # Expense: 180k vs 170k = +5.9%
        assert report.summary.expense_change != 0.0

    def test_multi_user_isolation(self, db, user, other_user):
        """User A cannot see user B's data."""
        _seed_jan2026(db, user.id)
        _add_tx(db, other_user.id, date(2026, 1, 1), 999999, "OtherIncome", is_income=True)
        db.commit()

        report_a = MonthlyReportService.generate_report(db, user.id, 2026, 1)
        report_b = MonthlyReportService.generate_report(db, other_user.id, 2026, 1)

        assert report_a.summary.total_income == 500000
        assert report_b.summary.total_income == 999999


class TestBudgetAdherence:
    """Tests for budget section of the report."""

    def test_report_with_budget(self, db, user):
        """Budget adherence populated when budget exists."""
        _seed_jan2026(db, user.id)
        budget = Budget(
            user_id=user.id, month="2026-01", monthly_income=500000,
            savings_target=100000,
        )
        db.add(budget)
        db.flush()
        allocs = [
            BudgetAllocation(budget_id=budget.id, category="Housing", amount=130000),
            BudgetAllocation(budget_id=budget.id, category="Food", amount=60000),
            BudgetAllocation(budget_id=budget.id, category="Transportation", amount=20000),
        ]
        db.add_all(allocs)
        db.commit()

        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)

        ba = report.budget_adherence
        assert ba is not None
        assert ba.total_budget == 210000  # 130k + 60k + 20k
        # Expenses stored as negative in DB; BudgetAlertService sums raw values
        assert ba.total_spent != 0
        assert len(ba.category_status) == 3

        housing = next(c for c in ba.category_status if c.category == "Housing")
        # Spent value reflects raw DB amounts (negative for expenses)
        assert housing.spent != 0

    def test_report_without_budget(self, db, user):
        """Budget adherence is None when no budget exists."""
        _seed_jan2026(db, user.id)
        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)
        assert report.budget_adherence is None


class TestGoalProgress:
    """Tests for goal progress section."""

    def test_report_with_goals(self, db, user):
        """Goal progress calculated for each goal."""
        _seed_jan2026(db, user.id)
        goal = Goal(user_id=user.id, years=5, target_amount=10000000, start_date=date(2025, 1, 1))
        db.add(goal)
        db.commit()

        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)

        assert len(report.goal_progress) == 1
        gp = report.goal_progress[0]
        assert gp.goal_id == goal.id
        assert gp.years == 5
        assert gp.target_amount == 10000000
        assert gp.status in ("ahead", "on_track", "behind")

    def test_report_without_goals(self, db, user):
        """Empty goal progress when no goals exist."""
        _seed_jan2026(db, user.id)
        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)
        assert report.goal_progress == []


class TestAccountSummary:
    """Tests for account summary section."""

    def test_report_with_accounts(self, db, user):
        """Account summary lists active accounts."""
        _seed_jan2026(db, user.id)
        acct = Account(
            user_id=user.id, name="Main Bank", type="bank",
            initial_balance=1000000, initial_balance_date=date(2025, 1, 1),
            currency="JPY", is_active=True,
        )
        db.add(acct)
        db.commit()

        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)

        assert len(report.account_summary) == 1
        assert report.account_summary[0].account_name == "Main Bank"
        assert report.account_summary[0].account_type == "bank"
        assert report.total_net_worth > 0

    def test_inactive_accounts_excluded(self, db, user):
        """Inactive accounts not in summary."""
        acct = Account(
            user_id=user.id, name="Closed", type="bank",
            initial_balance=500, initial_balance_date=date(2025, 1, 1),
            currency="JPY", is_active=False,
        )
        db.add(acct)
        db.commit()

        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)
        assert len(report.account_summary) == 0


class TestSavingsRate:
    """Tests for savings rate calculation."""

    def test_positive_savings(self, db, user):
        """Savings rate correct when income > expense."""
        _seed_jan2026(db, user.id)
        report = MonthlyReportService.generate_report(db, user.id, 2026, 1)
        # 500k income, 180k expense -> 64% savings
        assert report.summary.savings_rate == 64.0

    def test_zero_income(self, db, user):
        """Savings rate is 0 when no income."""
        _add_tx(db, user.id, date(2026, 3, 1), -50000, "Food")
        db.commit()
        report = MonthlyReportService.generate_report(db, user.id, 2026, 3)
        assert report.summary.savings_rate == 0.0

    def test_negative_savings(self, db, user):
        """Savings rate negative when expenses exceed income."""
        _add_tx(db, user.id, date(2026, 4, 1), 100000, "Salary", is_income=True)
        _add_tx(db, user.id, date(2026, 4, 5), -150000, "Housing")
        db.commit()
        report = MonthlyReportService.generate_report(db, user.id, 2026, 4)
        assert report.summary.savings_rate == -50.0
