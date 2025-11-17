"""Tests for goal service."""
from datetime import date
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.models.goal import Goal
from app.models.transaction import Transaction
from app.services.goal_service import GoalService
from app.utils.transaction_hasher import generate_tx_hash


class TestGoalService:
    """Tests for GoalService."""

    def test_create_goal(self, db_session: Session):
        """Test creating a goal."""
        goal_data = {
            "years": 5,
            "target_amount": 10000000,
            "start_date": date(2024, 1, 1),
        }

        goal = GoalService.create_goal(db_session, goal_data)

        assert goal.id is not None
        assert goal.years == 5
        assert goal.target_amount == 10000000

    def test_get_goal(self, db_session: Session):
        """Test getting a goal by ID."""
        goal = Goal(years=3, target_amount=5000000)
        db_session.add(goal)
        db_session.commit()

        retrieved = GoalService.get_goal(db_session, goal.id)

        assert retrieved is not None
        assert retrieved.years == 3

    def test_get_goal_by_years(self, db_session: Session):
        """Test getting a goal by year horizon."""
        goal = Goal(years=10, target_amount=20000000)
        db_session.add(goal)
        db_session.commit()

        retrieved = GoalService.get_goal_by_years(db_session, 10)

        assert retrieved is not None
        assert retrieved.target_amount == 20000000

    def test_get_all_goals(self, db_session: Session):
        """Test getting all goals ordered by years."""
        goals = [
            Goal(years=10, target_amount=20000000),
            Goal(years=1, target_amount=2000000),
            Goal(years=5, target_amount=10000000),
        ]

        for goal in goals:
            db_session.add(goal)
        db_session.commit()

        all_goals = GoalService.get_all_goals(db_session)

        assert len(all_goals) == 3
        assert [g.years for g in all_goals] == [1, 5, 10]

    def test_update_goal(self, db_session: Session):
        """Test updating a goal."""
        goal = Goal(years=5, target_amount=10000000)
        db_session.add(goal)
        db_session.commit()

        updated = GoalService.update_goal(
            db_session, goal.id, {"target_amount": 15000000}
        )

        assert updated.target_amount == 15000000

    def test_delete_goal(self, db_session: Session):
        """Test deleting a goal."""
        goal = Goal(years=5, target_amount=10000000)
        db_session.add(goal)
        db_session.commit()
        goal_id = goal.id

        result = GoalService.delete_goal(db_session, goal_id)

        assert result is True
        assert GoalService.get_goal(db_session, goal_id) is None

    def test_calculate_goal_progress_basic(self, db_session: Session):
        """Test calculating goal progress with real transactions."""
        # Create goal
        goal = Goal(
            years=1,
            target_amount=1200000,  # 100k per month
            start_date=date(2024, 1, 1),
        )
        db_session.add(goal)
        db_session.commit()

        # Create transactions for 6 months
        for month in range(1, 7):
            income_hash = generate_tx_hash(
                f"2024-{month:02d}-15", 200000, f"Salary {month}", "Bank"
            )
            expense_hash = generate_tx_hash(
                f"2024-{month:02d}-20", -100000, f"Expenses {month}", "Card"
            )

            income = Transaction(
                date=date(2024, month, 15),
                description=f"Salary {month}",
                amount=200000,
                category="Income",
                source="Bank",
                is_income=True,
                is_transfer=False,
                month_key=f"2024-{month:02d}",
                tx_hash=income_hash,
            )

            expense = Transaction(
                date=date(2024, month, 20),
                description=f"Expenses {month}",
                amount=-100000,
                category="Food",
                source="Card",
                is_income=False,
                is_transfer=False,
                month_key=f"2024-{month:02d}",
                tx_hash=expense_hash,
            )

            db_session.add_all([income, expense])

        db_session.commit()

        # Calculate progress
        progress = GoalService.calculate_goal_progress(db_session, goal)

        assert progress["total_saved"] == 600000  # 100k * 6 months
        assert progress["target_amount"] == 1200000
        assert progress["progress_percentage"] == 50.0

    def test_calculate_goal_progress_status_ahead(self, db_session: Session):
        """Test goal status calculation when ahead of target."""
        goal = Goal(
            years=1,
            target_amount=1000000,
            start_date=date(2024, 1, 1),
        )
        db_session.add(goal)
        db_session.commit()

        # Create high savings (200k per month for 6 months)
        for month in range(1, 7):
            tx_hash = generate_tx_hash(
                f"2024-{month:02d}-15", 200000, f"Savings {month}", "Bank"
            )

            tx = Transaction(
                date=date(2024, month, 15),
                description=f"Savings {month}",
                amount=200000,
                category="Income",
                source="Bank",
                is_income=True,
                is_transfer=False,
                month_key=f"2024-{month:02d}",
                tx_hash=tx_hash,
            )
            db_session.add(tx)

        db_session.commit()

        progress = GoalService.calculate_goal_progress(db_session, goal)

        assert progress["status"] == "ahead"
        assert progress["total_saved"] == 1200000

    def test_calculate_goal_progress_status_behind(self, db_session: Session):
        """Test goal status calculation when behind target."""
        goal = Goal(
            years=1,
            target_amount=1200000,
            start_date=date(2024, 1, 1),
        )
        db_session.add(goal)
        db_session.commit()

        # Create low savings (20k per month for 6 months)
        for month in range(1, 7):
            tx_hash = generate_tx_hash(
                f"2024-{month:02d}-15", 20000, f"Savings {month}", "Bank"
            )

            tx = Transaction(
                date=date(2024, month, 15),
                description=f"Savings {month}",
                amount=20000,
                category="Income",
                source="Bank",
                is_income=True,
                is_transfer=False,
                month_key=f"2024-{month:02d}",
                tx_hash=tx_hash,
            )
            db_session.add(tx)

        db_session.commit()

        progress = GoalService.calculate_goal_progress(db_session, goal)

        assert progress["status"] == "behind"

    def test_calculate_goal_progress_excludes_transfers(self, db_session: Session):
        """Test that goal progress excludes transfer transactions."""
        goal = Goal(
            years=1,
            target_amount=1000000,
            start_date=date(2024, 1, 1),
        )
        db_session.add(goal)
        db_session.commit()

        # Create income and transfer
        income_hash = generate_tx_hash("2024-01-15", 100000, "Income", "Bank")
        transfer_hash = generate_tx_hash("2024-01-20", 50000, "Transfer", "Card")

        income = Transaction(
            date=date(2024, 1, 15),
            description="Income",
            amount=100000,
            category="Income",
            source="Bank",
            is_income=True,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=income_hash,
        )

        transfer = Transaction(
            date=date(2024, 1, 20),
            description="Transfer",
            amount=50000,
            category="Other",
            source="Card",
            is_income=False,
            is_transfer=True,  # Should be excluded
            month_key="2024-01",
            tx_hash=transfer_hash,
        )

        db_session.add_all([income, transfer])
        db_session.commit()

        progress = GoalService.calculate_goal_progress(db_session, goal)

        assert progress["total_saved"] == 100000  # Only income, not transfer

    def test_calculate_goal_progress_no_transactions(self, db_session: Session):
        """Test goal progress with no transactions."""
        goal = Goal(
            years=5,
            target_amount=10000000,
        )
        db_session.add(goal)
        db_session.commit()

        progress = GoalService.calculate_goal_progress(db_session, goal)

        assert progress["total_saved"] == 0
        assert progress["progress_percentage"] == 0.0

    def test_calculate_goal_progress_needed_per_month(self, db_session: Session):
        """Test calculation of needed per month savings."""
        goal = Goal(
            years=1,
            target_amount=1200000,
            start_date=date(2024, 1, 1),
        )
        db_session.add(goal)
        db_session.commit()

        # Add 6 months of savings (300k total)
        for month in range(1, 7):
            tx_hash = generate_tx_hash(
                f"2024-{month:02d}-15", 50000, f"Savings {month}", "Bank"
            )

            tx = Transaction(
                date=date(2024, month, 15),
                description=f"Savings {month}",
                amount=50000,
                category="Income",
                source="Bank",
                is_income=True,
                is_transfer=False,
                month_key=f"2024-{month:02d}",
                tx_hash=tx_hash,
            )
            db_session.add(tx)

        db_session.commit()

        # Mock today to be mid-way through the goal (6 months in, 6 months remaining)
        with patch("app.services.goal_service.date") as mock_date:
            mock_date.today.return_value = date(2024, 7, 15)
            mock_date.side_effect = lambda *args, **kw: date(*args, **kw)
            progress = GoalService.calculate_goal_progress(db_session, goal)

        # Saved 300k, need 900k more over 6 months = 150k per month
        assert progress["total_saved"] == 300000
        assert progress["needed_remaining"] == 900000
        assert progress["needed_per_month"] == 150000
