"""Account service for CRUD operations and balance calculations."""
import hashlib
from datetime import date, datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.account import Account
from ..models.transaction import Transaction


class AccountService:
    """Service for account operations."""

    @staticmethod
    def create_account(db: Session, account_data: dict) -> Account:
        """Create a new account.

        Args:
            db: Database session
            account_data: Account data dictionary (must include user_id)

        Returns:
            Created account
        """
        account = Account(**account_data)
        db.add(account)
        db.commit()
        db.refresh(account)
        return account

    @staticmethod
    def get_account(db: Session, user_id: int, account_id: int) -> Optional[Account]:
        """Get account by ID for a specific user.

        Args:
            db: Database session
            user_id: User ID
            account_id: Account ID

        Returns:
            Account or None if not found
        """
        return db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == user_id
        ).first()

    @staticmethod
    def get_all_accounts(db: Session, user_id: int, include_inactive: bool = False) -> list[Account]:
        """Get all accounts for a specific user.

        Args:
            db: Database session
            user_id: User ID
            include_inactive: Include inactive accounts

        Returns:
            List of accounts
        """
        query = db.query(Account).filter(Account.user_id == user_id)
        if not include_inactive:
            query = query.filter(Account.is_active == True)
        return query.order_by(Account.name).all()

    @staticmethod
    def update_account(db: Session, user_id: int, account_id: int, account_data: dict) -> Optional[Account]:
        """Update account with balance adjustment support.

        Args:
            db: Database session
            user_id: User ID
            account_id: Account ID
            account_data: Updated account data

        Returns:
            Updated account or None if not found
        """
        account = db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == user_id
        ).first()
        if not account:
            return None

        # Get transaction count
        transaction_count = AccountService.get_transaction_count(db, user_id, account_id)

        # Extract balance-related fields
        initial_balance = account_data.pop("initial_balance", None)
        initial_balance_date = account_data.pop("initial_balance_date", None)
        desired_current_balance = account_data.pop("desired_current_balance", None)

        # SCENARIO 1: No transactions - direct update
        if transaction_count == 0 and initial_balance is not None:
            account.initial_balance = initial_balance
            if initial_balance_date:
                account.initial_balance_date = initial_balance_date

        # SCENARIO 2: Has transactions - create adjustment
        elif transaction_count > 0 and desired_current_balance is not None:
            # Calculate current balance
            current_balance = AccountService.calculate_balance(db, user_id, account_id)
            adjustment_amount = desired_current_balance - current_balance

            if adjustment_amount != 0:
                # Create adjustment transaction
                today = date.today()
                month_key = today.strftime("%Y-%m")

                # Create unique hash for adjustment transaction
                hash_input = f"{account_id}|{today}|{adjustment_amount}|Balance Adjustment|{datetime.now().timestamp()}"
                tx_hash = hashlib.sha256(hash_input.encode()).hexdigest()

                adjustment_tx = Transaction(
                    user_id=user_id,
                    account_id=account_id,
                    date=today,
                    description="Balance Adjustment",
                    amount=abs(adjustment_amount),
                    is_income=adjustment_amount > 0,
                    is_adjustment=True,
                    is_transfer=False,
                    category="adjustment",
                    source="system",
                    month_key=month_key,
                    tx_hash=tx_hash
                )
                db.add(adjustment_tx)

        # Update other fields
        for key, value in account_data.items():
            if hasattr(account, key):
                setattr(account, key, value)

        db.commit()
        db.refresh(account)
        return account

    @staticmethod
    def delete_account(db: Session, user_id: int, account_id: int) -> bool:
        """Soft delete account (set is_active=False).

        Args:
            db: Database session
            user_id: User ID
            account_id: Account ID

        Returns:
            True if deleted, False if not found
        """
        account = db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == user_id
        ).first()
        if not account:
            return False

        account.is_active = False
        db.commit()
        return True

    @staticmethod
    def calculate_balance(
        db: Session,
        user_id: int,
        account_id: int,
        as_of_date: Optional[date] = None
    ) -> int:
        """Calculate account balance from initial balance + transactions.

        Args:
            db: Database session
            user_id: User ID
            account_id: Account ID
            as_of_date: Optional date to calculate balance as of (defaults to today)

        Returns:
            Balance in smallest currency unit (cents/yen)

        Raises:
            ValueError: If account not found
        """
        account = db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == user_id
        ).first()
        if not account:
            raise ValueError(f"Account {account_id} not found")

        # Start with initial balance
        balance = account.initial_balance

        # Build query for transactions from initial_balance_date onwards
        query = db.query(Transaction).filter(
            Transaction.account_id == account_id,
            Transaction.user_id == user_id,
            Transaction.date >= account.initial_balance_date
        )

        # Filter by as_of_date if provided
        if as_of_date:
            query = query.filter(Transaction.date <= as_of_date)

        # Calculate balance from transactions
        # Amount is already signed: positive for income, negative for expense
        transactions = query.all()
        for txn in transactions:
            balance += txn.amount

        return balance

    @staticmethod
    def get_transaction_count(db: Session, user_id: int, account_id: int) -> int:
        """Get count of transactions for account.

        Args:
            db: Database session
            user_id: User ID
            account_id: Account ID

        Returns:
            Transaction count
        """
        return db.query(func.count(Transaction.id)).filter(
            Transaction.account_id == account_id,
            Transaction.user_id == user_id
        ).scalar() or 0

    @staticmethod
    def get_or_create_crypto_income_account(db: Session, user_id: int) -> Account:
        """Get or create the default Crypto Income account for reward transactions.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Crypto Income account
        """
        # Look for existing Crypto Income account
        account = db.query(Account).filter(
            Account.user_id == user_id,
            Account.name == "Crypto Income",
            Account.is_active == True
        ).first()

        if account:
            return account

        # Create new Crypto Income account
        account = Account(
            user_id=user_id,
            name="Crypto Income",
            type="income",
            currency="USD",
            initial_balance=0,
            initial_balance_date=date.today(),
            is_active=True,
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        return account
