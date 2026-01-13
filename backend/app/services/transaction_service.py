"""Transaction service for CRUD operations and filtering."""

from datetime import date
from typing import Optional

from sqlalchemy import func, desc
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
    def bulk_create_transactions(db: Session, transactions_data: list[dict]) -> tuple[int, int]:
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
        return (
            db.query(Transaction)
            .filter(Transaction.id == transaction_id, Transaction.user_id == user_id)
            .first()
        )

    @staticmethod
    def get_transactions(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        categories: Optional[list[str]] = None,
        source: Optional[str] = None,
        is_income: Optional[bool] = None,
        is_transfer: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Transaction]:
        """Get filtered transactions for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date
            categories: Filter by categories (list, uses IN clause)
            source: Filter by source
            is_income: Filter by income flag
            is_transfer: Filter by transfer flag
            search: Search description (case-insensitive partial match)
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
        if categories:
            query = query.filter(Transaction.category.in_(categories))
        if source:
            query = query.filter(Transaction.source == source)
        if is_income is not None:
            query = query.filter(Transaction.is_income == is_income)
        if is_transfer is not None:
            query = query.filter(Transaction.is_transfer == is_transfer)
        if search:
            query = query.filter(Transaction.description.ilike(f"%{search}%"))

        return query.order_by(Transaction.created_at.desc()).limit(limit).offset(offset).all()

    @staticmethod
    def count_transactions(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        categories: Optional[list[str]] = None,
        source: Optional[str] = None,
        is_income: Optional[bool] = None,
        is_transfer: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> int:
        """Count transactions matching filters for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date
            categories: Filter by categories (list)
            source: Filter by source
            is_income: Filter by income flag
            is_transfer: Filter by transfer flag
            search: Search description (case-insensitive partial match)

        Returns:
            Count of matching transactions
        """
        query = db.query(func.count(Transaction.id)).filter(Transaction.user_id == user_id)

        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        if categories:
            query = query.filter(Transaction.category.in_(categories))
        if source:
            query = query.filter(Transaction.source == source)
        if is_income is not None:
            query = query.filter(Transaction.is_income == is_income)
        if is_transfer is not None:
            query = query.filter(Transaction.is_transfer == is_transfer)
        if search:
            query = query.filter(Transaction.description.ilike(f"%{search}%"))

        return query.scalar()

    @staticmethod
    def update_transaction(
        db: Session, user_id: int, transaction_id: int, update_data: dict
    ) -> Optional[Transaction]:
        """Update a transaction.

        Args:
            db: Database session
            user_id: User ID (for authorization)
            transaction_id: Transaction ID
            update_data: Dictionary of fields to update

        Returns:
            Updated transaction or None if not found

        Raises:
            ValueError: If trying to update a transaction that doesn't belong to user
        """
        transaction = (
            db.query(Transaction)
            .filter(Transaction.id == transaction_id, Transaction.user_id == user_id)
            .first()
        )

        if not transaction:
            return None

        # Update fields
        for key, value in update_data.items():
            if hasattr(transaction, key) and key not in ["id", "created_at", "user_id"]:
                setattr(transaction, key, value)

        # Regenerate month_key if date changed
        if "date" in update_data:
            transaction.month_key = update_data["date"].strftime("%Y-%m")

        db.commit()
        db.refresh(transaction)
        return transaction

    @staticmethod
    def delete_transaction(db: Session, user_id: int, transaction_id: int) -> bool:
        """Delete a transaction.

        Args:
            db: Database session
            user_id: User ID (for authorization)
            transaction_id: Transaction ID

        Returns:
            True if deleted, False if not found
        """
        transaction = (
            db.query(Transaction)
            .filter(Transaction.id == transaction_id, Transaction.user_id == user_id)
            .first()
        )

        if not transaction:
            return False

        db.delete(transaction)
        db.commit()
        return True

    @staticmethod
    def bulk_delete(db: Session, user_id: int, transaction_ids: list[int]) -> int:
        """Delete multiple transactions by ID.

        Args:
            db: Database session
            user_id: User ID (for isolation)
            transaction_ids: List of transaction IDs to delete

        Returns:
            Number of deleted transactions
        """
        result = (
            db.query(Transaction)
            .filter(Transaction.user_id == user_id, Transaction.id.in_(transaction_ids))
            .delete(synchronize_session=False)
        )
        db.commit()
        return result

    @staticmethod
    def bulk_update_category(
        db: Session, user_id: int, transaction_ids: list[int], category: str
    ) -> int:
        """Update category for multiple transactions.

        Args:
            db: Database session
            user_id: User ID (for isolation)
            transaction_ids: List of transaction IDs to update
            category: New category name

        Returns:
            Number of updated transactions
        """
        result = (
            db.query(Transaction)
            .filter(Transaction.user_id == user_id, Transaction.id.in_(transaction_ids))
            .update({"category": category}, synchronize_session=False)
        )
        db.commit()
        return result

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
            Transaction.user_id == user_id, ~Transaction.is_transfer
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

    @staticmethod
    def get_suggestions(
        db: Session,
        user_id: int,
        query: str,
        limit: int = 5,
    ) -> list[dict]:
        """Get autocomplete suggestions based on recent transactions.

        Args:
            db: Database session
            user_id: User ID
            query: Search query (prefix match on description)
            limit: Maximum suggestions to return

        Returns:
            List of suggestion dicts with description, amount, category, is_income, count
        """
        if not query or len(query) < 2:
            return []

        # Query transactions matching the description prefix
        # Group by description to get unique suggestions
        # Return most recent amount/category for each description
        subquery = (
            db.query(
                Transaction.description,
                Transaction.amount,
                Transaction.category,
                Transaction.is_income,
                Transaction.date,
                func.count(Transaction.id)
                .over(partition_by=Transaction.description)
                .label("count"),
                func.row_number()
                .over(partition_by=Transaction.description, order_by=desc(Transaction.date))
                .label("rn"),
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.description.ilike(f"%{query}%"),
                ~Transaction.is_transfer,
                ~Transaction.is_adjustment,
            )
            .subquery()
        )

        # Get only the most recent transaction per description
        results = (
            db.query(
                subquery.c.description,
                subquery.c.amount,
                subquery.c.category,
                subquery.c.is_income,
                subquery.c.count,
            )
            .filter(subquery.c.rn == 1)
            .order_by(desc(subquery.c.count), desc(subquery.c.date))
            .limit(limit)
            .all()
        )

        return [
            {
                "description": r.description,
                "amount": abs(r.amount),  # Return positive amount
                "category": r.category,
                "is_income": r.is_income,
                "count": r.count,
            }
            for r in results
        ]
