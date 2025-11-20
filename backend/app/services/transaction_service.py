"""Transaction service for CRUD operations and filtering."""
from datetime import date
from typing import Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.transaction import Transaction


class TransactionService:
    """Service for transaction operations."""

    @staticmethod
    def create_transaction(db: Session, transaction_data: dict) -> Transaction:
        """Create a new transaction.

        Args:
            db: Database session
            transaction_data: Transaction data dictionary (must include user_id)

        Returns:
            Created transaction

        Raises:
            IntegrityError: If duplicate transaction (by tx_hash)
        """
        transaction = Transaction(**transaction_data)
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction

    @staticmethod
    def bulk_create_transactions(
        db: Session, transactions_data: list[dict]
    ) -> tuple[int, int]:
        """Bulk create transactions with duplicate handling.

        Args:
            db: Database session
            transactions_data: List of transaction data dictionaries (must include user_id)

        Returns:
            Tuple of (created_count, skipped_count)
        """
        created = 0
        skipped = 0

        for tx_data in transactions_data:
            try:
                TransactionService.create_transaction(db, tx_data)
                created += 1
            except IntegrityError:
                db.rollback()
                skipped += 1
                continue

        return created, skipped

    @staticmethod
    def get_transaction(db: Session, user_id: int, transaction_id: int) -> Optional[Transaction]:
        """Get transaction by ID for a specific user.

        Args:
            db: Database session
            user_id: User ID
            transaction_id: Transaction ID

        Returns:
            Transaction or None
        """
        return db.query(Transaction).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id
        ).first()

    @staticmethod
    def get_transactions(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category: Optional[str] = None,
        source: Optional[str] = None,
        is_income: Optional[bool] = None,
        is_transfer: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Transaction]:
        """Get filtered transactions for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date
            category: Filter by category
            source: Filter by source
            is_income: Filter by income flag
            is_transfer: Filter by transfer flag
            limit: Maximum results
            offset: Pagination offset

        Returns:
            List of transactions
        """
        query = db.query(Transaction).filter(Transaction.user_id == user_id)

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        if category:
            query = query.filter(Transaction.category == category)
        if source:
            query = query.filter(Transaction.source == source)
        if is_income is not None:
            query = query.filter(Transaction.is_income == is_income)
        if is_transfer is not None:
            query = query.filter(Transaction.is_transfer == is_transfer)

        return query.order_by(Transaction.date.desc()).limit(limit).offset(offset).all()

    @staticmethod
    def count_transactions(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category: Optional[str] = None,
        source: Optional[str] = None,
        is_income: Optional[bool] = None,
        is_transfer: Optional[bool] = None,
    ) -> int:
        """Count transactions matching filters for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date
            category: Filter by category
            source: Filter by source
            is_income: Filter by income flag
            is_transfer: Filter by transfer flag

        Returns:
            Count of matching transactions
        """
        query = db.query(func.count(Transaction.id)).filter(Transaction.user_id == user_id)

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        if category:
            query = query.filter(Transaction.category == category)
        if source:
            query = query.filter(Transaction.source == source)
        if is_income is not None:
            query = query.filter(Transaction.is_income == is_income)
        if is_transfer is not None:
            query = query.filter(Transaction.is_transfer == is_transfer)

        return query.scalar()

    @staticmethod
    def get_summary(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """Get transaction summary for date range for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            Dictionary with income, expenses, and net
        """
        query = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            ~Transaction.is_transfer
        )

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)

        transactions = query.all()

        income = sum(tx.amount for tx in transactions if tx.is_income)
        expenses = abs(sum(tx.amount for tx in transactions if not tx.is_income))

        return {
            "income": income,
            "expenses": expenses,
            "net": income - expenses,
            "count": len(transactions),
        }
