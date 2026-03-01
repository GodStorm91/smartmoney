"""Transaction service for CRUD operations and filtering."""
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.transaction import Transaction
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


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
        categories: Optional[list[str]] = None,
        source: Optional[str] = None,
        is_income: Optional[bool] = None,
        is_transfer: Optional[bool] = None,
        account_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Transaction]:
        """Get filtered transactions for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date
            categories: Filter by list of category names
            source: Filter by source
            is_income: Filter by income flag
            is_transfer: Filter by transfer flag
            account_id: Filter by account ID
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
        if account_id is not None:
            query = query.filter(Transaction.account_id == account_id)

        return query.order_by(Transaction.date.desc()).limit(limit).offset(offset).all()

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
        account_id: Optional[int] = None,
    ) -> int:
        """Count transactions matching filters for a specific user.

        Args:
            db: Database session
            user_id: User ID
            start_date: Filter by start date
            end_date: Filter by end date
            categories: Filter by list of category names
            source: Filter by source
            is_income: Filter by income flag
            is_transfer: Filter by transfer flag
            account_id: Filter by account ID

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
        if account_id is not None:
            query = query.filter(Transaction.account_id == account_id)

        return query.scalar()

    @staticmethod
    def update_transaction(
        db: Session,
        user_id: int,
        transaction_id: int,
        update_data: dict
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
        transaction = db.query(Transaction).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id
        ).first()

        if not transaction:
            return None

        # Update fields
        for key, value in update_data.items():
            if hasattr(transaction, key) and key not in ['id', 'created_at', 'user_id']:
                setattr(transaction, key, value)

        # Regenerate month_key if date changed
        if 'date' in update_data:
            transaction.month_key = update_data['date'].strftime("%Y-%m")

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

        Raises:
            ValueError: If trying to delete a transaction that doesn't belong to user
        """
        transaction = db.query(Transaction).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id
        ).first()

        if not transaction:
            return False

        db.delete(transaction)
        db.commit()
        return True

    @staticmethod
    def find_fuzzy_duplicates(
        db: Session,
        user_id: int,
        threshold: float = 0.75,
        date_window_days: int = 3,
        limit: int = 50
    ) -> list[dict]:
        """Find likely duplicate transactions using fuzzy matching.

        Groups transactions by: same amount + similar description + close dates.
        Uses SequenceMatcher for description similarity (no external deps needed).
        """
        from difflib import SequenceMatcher

        # Get recent transactions (last 6 months to keep it fast)
        six_months_ago = date.today() - timedelta(days=180)
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.date >= six_months_ago
        ).order_by(Transaction.date.desc()).all()

        # Group by amount for O(n) instead of O(n²)
        amount_groups: dict[int, list] = {}
        for tx in transactions:
            amount_groups.setdefault(tx.amount, []).append(tx)

        duplicates = []
        seen_pairs = set()

        for amount, group in amount_groups.items():
            if len(group) < 2:
                continue

            for i, tx1 in enumerate(group):
                for tx2 in group[i+1:]:
                    pair_key = (min(tx1.id, tx2.id), max(tx1.id, tx2.id))
                    if pair_key in seen_pairs:
                        continue

                    # Check date proximity
                    date_diff = abs((tx1.date - tx2.date).days)
                    if date_diff > date_window_days:
                        continue

                    # Check description similarity
                    similarity = SequenceMatcher(
                        None,
                        tx1.description.lower(),
                        tx2.description.lower()
                    ).ratio()

                    if similarity >= threshold:
                        seen_pairs.add(pair_key)
                        duplicates.append({
                            "transaction_1": {
                                "id": tx1.id,
                                "date": tx1.date.isoformat(),
                                "description": tx1.description,
                                "amount": tx1.amount,
                                "currency": tx1.currency,
                                "category": tx1.category,
                                "source": tx1.source,
                                "type": "income" if tx1.is_income else "expense",
                                "account_id": tx1.account_id,
                            },
                            "transaction_2": {
                                "id": tx2.id,
                                "date": tx2.date.isoformat(),
                                "description": tx2.description,
                                "amount": tx2.amount,
                                "currency": tx2.currency,
                                "category": tx2.category,
                                "source": tx2.source,
                                "type": "income" if tx2.is_income else "expense",
                                "account_id": tx2.account_id,
                            },
                            "similarity": round(similarity, 2),
                            "date_diff_days": date_diff,
                        })

                        if len(duplicates) >= limit:
                            return sorted(duplicates, key=lambda d: d["similarity"], reverse=True)

        return sorted(duplicates, key=lambda d: d["similarity"], reverse=True)

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

        # Convert each transaction to JPY before summing
        rates = ExchangeRateService.get_cached_rates(db)
        income = sum(
            convert_to_jpy(tx.amount, tx.currency, rates)
            for tx in transactions if tx.is_income
        )
        expenses = abs(sum(
            convert_to_jpy(tx.amount, tx.currency, rates)
            for tx in transactions if not tx.is_income
        ))

        return {
            "income": income,
            "expenses": expenses,
            "net": income - expenses,
            "count": len(transactions),
        }
