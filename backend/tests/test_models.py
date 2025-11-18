"""Tests for database models."""
from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.goal import Goal
from app.models.settings import AppSettings
from app.models.transaction import Transaction
from app.utils.transaction_hasher import generate_tx_hash


class TestTransactionModel:
    """Tests for Transaction model."""

    def test_create_transaction_valid(self, db_session: Session):
        """Test creating a valid transaction."""
        tx_hash = generate_tx_hash("2024-01-15", -5000, "Grocery", "Rakuten Card")

        tx = Transaction(
            date=date(2024, 1, 15),
            description="Grocery shopping",
            amount=-5000,
            category="Food",
            subcategory="Groceries",
            source="Rakuten Card",
            is_income=False,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=tx_hash,
        )

        db_session.add(tx)
        db_session.commit()
        db_session.refresh(tx)

        assert tx.id is not None
        assert tx.amount == -5000
        assert tx.month_key == "2024-01"
        assert tx.category == "Food"

    def test_transaction_amount_nonzero_constraint(self, db_session: Session):
        """Test that amount cannot be zero."""
        tx_hash = generate_tx_hash("2024-01-15", 0, "Test", "Source")

        tx = Transaction(
            date=date(2024, 1, 15),
            description="Test transaction",
            amount=0,  # Invalid: must not be zero
            category="Food",
            source="Test Source",
            is_income=False,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=tx_hash,
        )

        db_session.add(tx)

        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_transaction_duplicate_hash(self, db_session: Session):
        """Test that tx_hash must be unique."""
        tx_hash = generate_tx_hash("2024-01-15", -5000, "Grocery", "Rakuten Card")

        # Create first transaction
        tx1 = Transaction(
            date=date(2024, 1, 15),
            description="Grocery shopping",
            amount=-5000,
            category="Food",
            source="Rakuten Card",
            is_income=False,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=tx_hash,
        )
        db_session.add(tx1)
        db_session.commit()

        # Try to create duplicate
        tx2 = Transaction(
            date=date(2024, 1, 15),
            description="Grocery shopping",
            amount=-5000,
            category="Food",
            source="Rakuten Card",
            is_income=False,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=tx_hash,  # Same hash
        )
        db_session.add(tx2)

        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_transaction_month_key_format(self, db_session: Session):
        """Test that month_key follows YYYY-MM format."""
        tx_hash = generate_tx_hash("2024-01-15", -5000, "Test", "Source")

        tx = Transaction(
            date=date(2024, 1, 15),
            description="Test",
            amount=-5000,
            category="Food",
            source="Source",
            is_income=False,
            is_transfer=False,
            month_key="2024-01",  # Valid format
            tx_hash=tx_hash,
        )

        db_session.add(tx)
        db_session.commit()

        assert tx.month_key == "2024-01"
        assert len(tx.month_key) == 7


class TestGoalModel:
    """Tests for Goal model."""

    def test_create_goal_valid(self, db_session: Session):
        """Test creating a valid goal."""
        goal = Goal(
            years=5,
            target_amount=10000000,
            start_date=date(2024, 1, 1),
        )

        db_session.add(goal)
        db_session.commit()
        db_session.refresh(goal)

        assert goal.id is not None
        assert goal.years == 5
        assert goal.target_amount == 10000000

    def test_goal_years_constraint(self, db_session: Session):
        """Test that years must be between 1 and 10 (inclusive)."""
        # Test year below minimum (0)
        goal_zero = Goal(
            years=0,  # Invalid: must be >= 1
            target_amount=5000000,
        )
        db_session.add(goal_zero)
        with pytest.raises(IntegrityError):
            db_session.commit()

        db_session.rollback()

        # Test year above maximum (11)
        goal_eleven = Goal(
            years=11,  # Invalid: must be <= 10
            target_amount=5000000,
        )
        db_session.add(goal_eleven)
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_goal_positive_target_constraint(self, db_session: Session):
        """Test that target_amount must be positive."""
        goal = Goal(
            years=5,
            target_amount=-1000000,  # Invalid: must be positive
        )

        db_session.add(goal)

        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_goal_years_unique_constraint(self, db_session: Session):
        """Test that only one goal per year horizon is allowed."""
        # Create first goal
        goal1 = Goal(years=5, target_amount=10000000)
        db_session.add(goal1)
        db_session.commit()

        # Try to create duplicate
        goal2 = Goal(years=5, target_amount=15000000)
        db_session.add(goal2)

        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_goal_all_valid_years(self, db_session: Session):
        """Test creating goals for all valid year horizons (1-10 range including custom)."""
        # Test preset years
        preset_years = [1, 3, 5, 10]
        for years in preset_years:
            goal = Goal(years=years, target_amount=years * 1000000)
            db_session.add(goal)

        # Test custom years within valid range
        custom_years = [2, 7]
        for years in custom_years:
            goal = Goal(years=years, target_amount=years * 1000000)
            db_session.add(goal)

        db_session.commit()

        all_goals = db_session.query(Goal).all()
        assert len(all_goals) == 6  # 4 preset + 2 custom


class TestAppSettingsModel:
    """Tests for AppSettings model."""

    def test_create_settings(self, db_session: Session):
        """Test creating app settings."""
        settings = AppSettings(
            id=1,
            currency="JPY",
            starting_net_worth=0,
            base_date=date(2024, 1, 1),
        )

        db_session.add(settings)
        db_session.commit()
        db_session.refresh(settings)

        assert settings.id == 1
        assert settings.currency == "JPY"

    def test_settings_singleton_constraint(self, db_session: Session):
        """Test that only one settings row (id=1) is allowed."""
        # Create first settings
        settings1 = AppSettings(id=1, currency="JPY")
        db_session.add(settings1)
        db_session.commit()

        # Try to create second settings with different id
        settings2 = AppSettings(id=2, currency="USD")
        db_session.add(settings2)

        with pytest.raises(IntegrityError):
            db_session.commit()
