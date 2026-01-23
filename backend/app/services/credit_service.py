"""Credit service for managing user credits with atomic transactions."""

from decimal import Decimal
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from ..models.user_credit import UserCredit
from ..models.credit_transaction import CreditTransaction


class InsufficientCreditsError(Exception):
    """Raised when user doesn't have enough credits for an operation."""

    pass


class CreditService:
    """Service for managing user credits with ACID guarantees."""

    def __init__(self, db: Session):
        self.db = db

    def get_balance(self, user_id: int) -> Decimal:
        """
        Get user's current credit balance.
        Creates account with 0 balance if doesn't exist.

        Args:
            user_id: The user ID

        Returns:
            The current credit balance
        """
        account = (
            self.db.query(UserCredit)
            .filter(UserCredit.user_id == user_id)
            .with_for_update()
            .first()
        )

        if not account:
            account = UserCredit(user_id=user_id, balance=Decimal("0.0000"))
            self.db.add(account)
            self.db.flush()

        return account.balance

    def get_account(self, user_id: int) -> UserCredit:
        """
        Get user's credit account with all statistics.
        Creates account if doesn't exist.

        Args:
            user_id: The user ID

        Returns:
            The UserCredit account object
        """
        account = self.db.query(UserCredit).filter(UserCredit.user_id == user_id).first()

        if not account:
            account = UserCredit(user_id=user_id, balance=Decimal("0.0000"))
            self.db.add(account)
            self.db.flush()

        return account

    def add_credits(
        self,
        user_id: int,
        amount: Decimal,
        transaction_type: str,
        reference_id: Optional[str] = None,
        description: str = "",
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> CreditTransaction:
        """
        Add credits to user account (purchase, refund, adjustment).
        Uses row-level locking for atomicity.

        Args:
            user_id: The user ID
            amount: Amount of credits to add (must be positive)
            transaction_type: Type of transaction (purchase, refund, adjustment)
            reference_id: Optional reference to external transaction
            description: Human-readable description
            extra_data: Optional metadata (JSON)

        Returns:
            The created transaction record

        Raises:
            ValueError: If amount is not positive
        """
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")

        # Lock user credit row for update
        account = (
            self.db.query(UserCredit)
            .filter(UserCredit.user_id == user_id)
            .with_for_update()
            .first()
        )

        if not account:
            account = UserCredit(user_id=user_id)
            self.db.add(account)
            self.db.flush()

        # Update balance
        account.balance += amount
        account.updated_at = datetime.utcnow()

        if transaction_type == "purchase":
            account.lifetime_purchased += amount
            account.last_purchase_date = datetime.utcnow()

        account.last_transaction_date = datetime.utcnow()

        # Create transaction record
        transaction = CreditTransaction(
            user_id=user_id,
            type=transaction_type,
            amount=amount,
            balance_after=account.balance,
            description=description or f"Added {amount} credits",
            reference_id=reference_id,
            extra_data=extra_data,
        )
        transaction.id = transaction.generate_id()

        self.db.add(transaction)
        self.db.flush()

        return transaction

    def deduct_credits(
        self,
        user_id: int,
        amount: Decimal,
        transaction_type: str,
        reference_id: Optional[str] = None,
        description: str = "",
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> CreditTransaction:
        """
        Deduct credits from user account (usage).
        Raises InsufficientCreditsError if balance too low.
        Uses row-level locking for atomicity.

        Args:
            user_id: The user ID
            amount: Amount of credits to deduct (must be positive)
            transaction_type: Type of transaction (usually 'usage')
            reference_id: Optional reference to external transaction
            description: Human-readable description
            extra_data: Optional metadata (JSON)

        Returns:
            The created transaction record

        Raises:
            ValueError: If amount is not positive
            InsufficientCreditsError: If balance < amount
        """
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")

        # Lock user credit row for update
        account = (
            self.db.query(UserCredit)
            .filter(UserCredit.user_id == user_id)
            .with_for_update()
            .first()
        )

        if not account:
            raise InsufficientCreditsError(f"User {user_id} has no credit account")

        # Check sufficient balance
        if account.balance < amount:
            raise InsufficientCreditsError(
                f"Insufficient credits. Have {account.balance}, need {amount}"
            )

        # Update balance
        account.balance -= amount
        account.updated_at = datetime.utcnow()

        if transaction_type == "usage":
            account.lifetime_spent += amount

        account.last_transaction_date = datetime.utcnow()

        # Create transaction record (negative amount for deduction)
        transaction = CreditTransaction(
            user_id=user_id,
            type=transaction_type,
            amount=-amount,  # Negative for debit
            balance_after=account.balance,
            description=description or f"Used {amount} credits",
            reference_id=reference_id,
            extra_data=extra_data,
        )
        transaction.id = transaction.generate_id()

        self.db.add(transaction)
        self.db.flush()

        return transaction

    def get_transaction_history(
        self, user_id: int, transaction_type: Optional[str] = None, limit: int = 20, offset: int = 0
    ) -> list[CreditTransaction]:
        """
        Get user's transaction history with optional filtering.

        Args:
            user_id: The user ID
            transaction_type: Optional filter by type (purchase, usage, refund, adjustment, or None for all)
            limit: Maximum number of records to return
            offset: Number of records to skip

        Returns:
            List of credit transactions, ordered by created_at DESC
        """
        query = self.db.query(CreditTransaction).filter(CreditTransaction.user_id == user_id)

        if transaction_type and transaction_type != "all":
            query = query.filter(CreditTransaction.type == transaction_type)

        transactions = (
            query.order_by(CreditTransaction.created_at.desc()).offset(offset).limit(limit).all()
        )

        return transactions

    def count_transactions(self, user_id: int, transaction_type: Optional[str] = None) -> int:
        """
        Count total transactions for a user.

        Args:
            user_id: The user ID
            transaction_type: Optional filter by type

        Returns:
            Total number of transactions
        """
        query = self.db.query(CreditTransaction).filter(CreditTransaction.user_id == user_id)

        if transaction_type and transaction_type != "all":
            query = query.filter(CreditTransaction.type == transaction_type)

        return query.count()
