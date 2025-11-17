"""Tests for transaction service."""
from datetime import date, timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.services.transaction_service import TransactionService
from app.utils.transaction_hasher import generate_tx_hash


class TestTransactionService:
    """Tests for TransactionService."""

    def test_create_transaction(self, db_session: Session):
        """Test creating a single transaction."""
        tx_hash = generate_tx_hash("2024-01-15", -5000, "Grocery", "Card")

        tx_data = {
            "date": date(2024, 1, 15),
            "description": "Grocery shopping",
            "amount": -5000,
            "category": "Food",
            "source": "Card",
            "is_income": False,
            "is_transfer": False,
            "month_key": "2024-01",
            "tx_hash": tx_hash,
        }

        tx = TransactionService.create_transaction(db_session, tx_data)

        assert tx.id is not None
        assert tx.amount == -5000
        assert tx.category == "Food"

    def test_create_duplicate_transaction_fails(self, db_session: Session):
        """Test that creating duplicate transaction raises IntegrityError."""
        tx_hash = generate_tx_hash("2024-01-15", -5000, "Grocery", "Card")

        tx_data = {
            "date": date(2024, 1, 15),
            "description": "Grocery shopping",
            "amount": -5000,
            "category": "Food",
            "source": "Card",
            "is_income": False,
            "is_transfer": False,
            "month_key": "2024-01",
            "tx_hash": tx_hash,
        }

        # Create first transaction
        TransactionService.create_transaction(db_session, tx_data)

        # Try to create duplicate
        with pytest.raises(IntegrityError):
            TransactionService.create_transaction(db_session, tx_data)

    def test_bulk_create_transactions(self, db_session: Session):
        """Test bulk creating transactions."""
        transactions_data = []
        for i in range(5):
            tx_hash = generate_tx_hash(f"2024-01-{i+1:02d}", -1000 * i, f"Tx {i}", "Card")
            transactions_data.append({
                "date": date(2024, 1, i + 1),
                "description": f"Transaction {i}",
                "amount": -1000 * (i + 1),
                "category": "Food",
                "source": "Card",
                "is_income": False,
                "is_transfer": False,
                "month_key": "2024-01",
                "tx_hash": tx_hash,
            })

        created, skipped = TransactionService.bulk_create_transactions(
            db_session, transactions_data
        )

        assert created == 5
        assert skipped == 0

    def test_bulk_create_with_duplicates(self, db_session: Session):
        """Test bulk create handles duplicates properly."""
        tx_hash = generate_tx_hash("2024-01-15", -5000, "Same", "Card")

        transactions_data = [
            {
                "date": date(2024, 1, 15),
                "description": "Same",
                "amount": -5000,
                "category": "Food",
                "source": "Card",
                "is_income": False,
                "is_transfer": False,
                "month_key": "2024-01",
                "tx_hash": tx_hash,
            },
            {
                "date": date(2024, 1, 15),
                "description": "Same",
                "amount": -5000,
                "category": "Food",
                "source": "Card",
                "is_income": False,
                "is_transfer": False,
                "month_key": "2024-01",
                "tx_hash": tx_hash,  # Duplicate
            },
        ]

        created, skipped = TransactionService.bulk_create_transactions(
            db_session, transactions_data
        )

        assert created == 1
        assert skipped == 1

    def test_get_transaction(self, db_session: Session, create_sample_transactions):
        """Test getting a transaction by ID."""
        transactions = create_sample_transactions(5)
        tx_id = transactions[0].id

        retrieved = TransactionService.get_transaction(db_session, tx_id)

        assert retrieved is not None
        assert retrieved.id == tx_id

    def test_get_transaction_not_found(self, db_session: Session):
        """Test getting non-existent transaction returns None."""
        result = TransactionService.get_transaction(db_session, 99999)
        assert result is None

    def test_get_transactions_no_filters(self, db_session: Session, create_sample_transactions):
        """Test getting all transactions without filters."""
        create_sample_transactions(10)

        transactions = TransactionService.get_transactions(db_session, limit=20)

        assert len(transactions) == 10

    def test_get_transactions_date_range(self, db_session: Session, create_sample_transactions):
        """Test filtering transactions by date range."""
        create_sample_transactions(10)

        start_date = date(2024, 1, 5)
        end_date = date(2024, 1, 15)

        transactions = TransactionService.get_transactions(
            db_session, start_date=start_date, end_date=end_date
        )

        assert all(start_date <= tx.date <= end_date for tx in transactions)

    def test_get_transactions_by_category(self, db_session: Session, create_sample_transactions):
        """Test filtering transactions by category."""
        create_sample_transactions(10)

        transactions = TransactionService.get_transactions(
            db_session, category="Food"
        )

        assert all(tx.category == "Food" for tx in transactions)

    def test_get_transactions_income_only(self, db_session: Session, create_sample_transactions):
        """Test filtering for income transactions only."""
        create_sample_transactions(10)

        transactions = TransactionService.get_transactions(
            db_session, is_income=True
        )

        assert all(tx.is_income for tx in transactions)
        assert len(transactions) > 0

    def test_get_transactions_exclude_transfers(self, db_session: Session):
        """Test filtering to exclude transfers."""
        tx_hash1 = generate_tx_hash("2024-01-15", -5000, "Normal", "Card")
        tx_hash2 = generate_tx_hash("2024-01-16", 5000, "Transfer", "Bank")

        normal_tx = Transaction(
            date=date(2024, 1, 15),
            description="Normal expense",
            amount=-5000,
            category="Food",
            source="Card",
            is_income=False,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=tx_hash1,
        )

        transfer_tx = Transaction(
            date=date(2024, 1, 16),
            description="Transfer",
            amount=5000,
            category="Other",
            source="Bank",
            is_income=False,
            is_transfer=True,
            month_key="2024-01",
            tx_hash=tx_hash2,
        )

        db_session.add_all([normal_tx, transfer_tx])
        db_session.commit()

        transactions = TransactionService.get_transactions(
            db_session, is_transfer=False
        )

        assert all(not tx.is_transfer for tx in transactions)

    def test_count_transactions(self, db_session: Session, create_sample_transactions):
        """Test counting transactions."""
        create_sample_transactions(15)

        count = TransactionService.count_transactions(db_session)

        assert count == 15

    def test_count_transactions_with_filters(self, db_session: Session, create_sample_transactions):
        """Test counting with filters."""
        create_sample_transactions(10)

        count = TransactionService.count_transactions(
            db_session, category="Food"
        )

        assert count > 0

    def test_get_summary(self, db_session: Session):
        """Test getting transaction summary."""
        # Create income and expense transactions
        income_hash = generate_tx_hash("2024-01-15", 200000, "Salary", "Bank")
        expense_hash = generate_tx_hash("2024-01-20", -50000, "Rent", "Card")

        income_tx = Transaction(
            date=date(2024, 1, 15),
            description="Salary",
            amount=200000,
            category="Income",
            source="Bank",
            is_income=True,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=income_hash,
        )

        expense_tx = Transaction(
            date=date(2024, 1, 20),
            description="Rent",
            amount=-50000,
            category="Housing",
            source="Card",
            is_income=False,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=expense_hash,
        )

        db_session.add_all([income_tx, expense_tx])
        db_session.commit()

        summary = TransactionService.get_summary(db_session)

        assert summary["income"] == 200000
        assert summary["expenses"] == 50000
        assert summary["net"] == 150000
        assert summary["count"] == 2

    def test_get_summary_excludes_transfers(self, db_session: Session):
        """Test that summary excludes transfer transactions."""
        income_hash = generate_tx_hash("2024-01-15", 200000, "Salary", "Bank")
        transfer_hash = generate_tx_hash("2024-01-20", 50000, "Transfer", "Card")

        income_tx = Transaction(
            date=date(2024, 1, 15),
            description="Salary",
            amount=200000,
            category="Income",
            source="Bank",
            is_income=True,
            is_transfer=False,
            month_key="2024-01",
            tx_hash=income_hash,
        )

        transfer_tx = Transaction(
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

        db_session.add_all([income_tx, transfer_tx])
        db_session.commit()

        summary = TransactionService.get_summary(db_session)

        assert summary["count"] == 1  # Only income, not transfer
