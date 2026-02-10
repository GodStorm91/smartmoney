"""Service for recurring transaction operations."""
import hashlib
from calendar import monthrange
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import uuid4

from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..models.recurring_transaction import RecurringTransaction
from ..models.transaction import Transaction
from ..utils.transaction_hasher import generate_tx_hash


class RecurringTransactionService:
    """Service for recurring transaction CRUD and scheduling."""

    @staticmethod
    def calculate_next_run_date(
        frequency: str,
        current_date: date,
        interval_days: Optional[int] = None,
        day_of_week: Optional[int] = None,
        day_of_month: Optional[int] = None,
        month_of_year: Optional[int] = None,
    ) -> date:
        """Calculate the next run date based on frequency settings.

        Args:
            frequency: daily, weekly, biweekly, monthly, yearly, or custom
            current_date: The reference date to calculate from
            interval_days: For custom frequency, run every N days
            day_of_week: For weekly, 0=Monday to 6=Sunday
            day_of_month: For monthly/yearly, day of month (1-31)
            month_of_year: For yearly, month of year (1-12)

        Returns:
            The next date to run the recurring transaction
        """
        if frequency == "daily":
            return current_date + timedelta(days=1)

        elif frequency == "biweekly":
            # Every 2 weeks (14 days)
            days_ahead = (day_of_week or 0) - current_date.weekday()
            if days_ahead <= 0:
                days_ahead += 14
            else:
                days_ahead += 7  # First occurrence
            return current_date + timedelta(days=days_ahead)

        elif frequency == "weekly":
            # Find next occurrence of day_of_week
            days_ahead = (day_of_week or 0) - current_date.weekday()
            if days_ahead <= 0:  # Target day already happened this week
                days_ahead += 7
            return current_date + timedelta(days=days_ahead)

        elif frequency == "monthly":
            # Same day next month
            target_day = day_of_month or current_date.day
            next_month = current_date.month + 1
            next_year = current_date.year

            if next_month > 12:
                next_month = 1
                next_year += 1

            # Handle months with fewer days (e.g., 31st in February)
            max_day = monthrange(next_year, next_month)[1]
            actual_day = min(target_day, max_day)

            return date(next_year, next_month, actual_day)

        elif frequency == "yearly":
            # Same date next year
            target_day = day_of_month or current_date.day
            target_month = month_of_year or current_date.month
            next_year = current_date.year + 1

            # Handle leap year edge case (Feb 29)
            max_day = monthrange(next_year, target_month)[1]
            actual_day = min(target_day, max_day)

            return date(next_year, target_month, actual_day)

        elif frequency == "custom":
            # Every N days
            days = interval_days or 7
            return current_date + timedelta(days=days)

        # Default: 7 days (weekly)
        return current_date + timedelta(days=7)

    @staticmethod
    def create_recurring(
        db: Session, user_id: int, data: dict
    ) -> RecurringTransaction:
        """Create a new recurring transaction.

        Args:
            db: Database session
            user_id: User ID
            data: Recurring transaction data

        Returns:
            Created recurring transaction
        """
        start_date = data.pop("start_date", date.today())
        end_date = data.pop("end_date", None)
        auto_submit = data.pop("auto_submit", False)

        # Calculate initial next_run_date
        next_run = RecurringTransactionService.calculate_next_run_date(
            frequency=data["frequency"],
            current_date=start_date,
            interval_days=data.get("interval_days"),
            day_of_week=data.get("day_of_week"),
            day_of_month=data.get("day_of_month"),
            month_of_year=data.get("month_of_year"),
        )

        # If the calculated date is before start_date, use start_date
        if next_run < start_date:
            next_run = start_date

        recurring = RecurringTransaction(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            next_run_date=next_run,
            auto_submit=auto_submit,
            **data,
        )

        db.add(recurring)
        db.commit()
        db.refresh(recurring)
        return recurring

    @staticmethod
    def get_recurring(
        db: Session, user_id: int, recurring_id: int
    ) -> Optional[RecurringTransaction]:
        """Get a single recurring transaction by ID."""
        return db.query(RecurringTransaction).filter(
            RecurringTransaction.id == recurring_id,
            RecurringTransaction.user_id == user_id,
        ).first()

    @staticmethod
    def list_recurring(
        db: Session, user_id: int, active_only: bool = False
    ) -> list[RecurringTransaction]:
        """List all recurring transactions for a user.

        Args:
            db: Database session
            user_id: User ID
            active_only: If True, only return active recurring transactions

        Returns:
            List of recurring transactions
        """
        query = db.query(RecurringTransaction).filter(
            RecurringTransaction.user_id == user_id
        )

        if active_only:
            query = query.filter(RecurringTransaction.is_active == True)

        return query.order_by(RecurringTransaction.next_run_date).all()

    @staticmethod
    def update_recurring(
        db: Session, user_id: int, recurring_id: int, update_data: dict
    ) -> Optional[RecurringTransaction]:
        """Update a recurring transaction.

        Args:
            db: Database session
            user_id: User ID
            recurring_id: Recurring transaction ID
            update_data: Fields to update

        Returns:
            Updated recurring transaction or None if not found
        """
        recurring = db.query(RecurringTransaction).filter(
            RecurringTransaction.id == recurring_id,
            RecurringTransaction.user_id == user_id,
        ).first()

        if not recurring:
            return None

        # Update fields
        for key, value in update_data.items():
            if hasattr(recurring, key) and value is not None:
                setattr(recurring, key, value)

        # Recalculate next_run_date if frequency settings changed
        frequency_fields = {"frequency", "interval_days", "day_of_week", "day_of_month", "month_of_year"}
        if frequency_fields & set(update_data.keys()):
            recurring.next_run_date = RecurringTransactionService.calculate_next_run_date(
                frequency=recurring.frequency,
                current_date=date.today(),
                interval_days=recurring.interval_days,
                day_of_week=recurring.day_of_week,
                day_of_month=recurring.day_of_month,
                month_of_year=recurring.month_of_year,
            )

        db.commit()
        db.refresh(recurring)
        return recurring

    @staticmethod
    def delete_recurring(
        db: Session, user_id: int, recurring_id: int
    ) -> bool:
        """Delete a recurring transaction.

        Args:
            db: Database session
            user_id: User ID
            recurring_id: Recurring transaction ID

        Returns:
            True if deleted, False if not found
        """
        recurring = db.query(RecurringTransaction).filter(
            RecurringTransaction.id == recurring_id,
            RecurringTransaction.user_id == user_id,
        ).first()

        if not recurring:
            return False

        db.delete(recurring)
        db.commit()
        return True

    @staticmethod
    def process_due_recurring(db: Session, target_date: Optional[date] = None) -> int:
        """Process all due recurring transactions and create actual transactions.

        Args:
            db: Database session
            target_date: Date to check against (defaults to today)

        Returns:
            Number of transactions created
        """
        if target_date is None:
            target_date = date.today()

        # Get all active recurring transactions due on or before target_date
        due_recurring = db.query(RecurringTransaction).filter(
            and_(
                RecurringTransaction.is_active == True,
                RecurringTransaction.next_run_date <= target_date,
            )
        ).all()

        created_count = 0

        for recurring in due_recurring:
            try:
                if recurring.is_transfer:
                    count = RecurringTransactionService._create_transfer_transactions(
                        db, recurring
                    )
                    created_count += count
                else:
                    RecurringTransactionService._create_single_transaction(
                        db, recurring
                    )
                    created_count += 1

                # Update recurring: set last_run_date and calculate next_run_date
                recurring.last_run_date = recurring.next_run_date
                recurring.next_run_date = RecurringTransactionService.calculate_next_run_date(
                    frequency=recurring.frequency,
                    current_date=recurring.next_run_date,
                    interval_days=recurring.interval_days,
                    day_of_week=recurring.day_of_week,
                    day_of_month=recurring.day_of_month,
                )

            except Exception as e:
                # Log error but continue processing other recurring transactions
                print(f"Error processing recurring {recurring.id}: {e}")
                continue

        db.commit()
        return created_count

    @staticmethod
    def _create_single_transaction(db: Session, recurring: RecurringTransaction) -> None:
        """Create a single (non-transfer) transaction from a recurring record."""
        tx_hash = generate_tx_hash(
            str(recurring.next_run_date),
            recurring.amount if recurring.is_income else -recurring.amount,
            recurring.description,
            f"recurring_{recurring.id}",
            recurring.user_id,
        )

        source = "Recurring"
        if recurring.account:
            source = recurring.account.name

        transaction = Transaction(
            user_id=recurring.user_id,
            date=recurring.next_run_date,
            description=recurring.description,
            amount=recurring.amount if recurring.is_income else -recurring.amount,
            currency=recurring.account.currency if recurring.account else "JPY",
            category=recurring.category,
            source=source,
            is_income=recurring.is_income,
            is_transfer=False,
            is_adjustment=False,
            month_key=recurring.next_run_date.strftime("%Y-%m"),
            tx_hash=tx_hash,
            account_id=recurring.account_id,
        )
        db.add(transaction)

    @staticmethod
    def _create_transfer_transactions(
        db: Session, recurring: RecurringTransaction
    ) -> int:
        """Create paired transfer transactions (outgoing + incoming + optional fee)."""
        transfer_id = str(uuid4())
        month_key = recurring.next_run_date.strftime("%Y-%m")
        timestamp = datetime.now().timestamp()

        from_name = recurring.account.name if recurring.account else "Unknown"
        to_name = recurring.to_account.name if recurring.to_account else "Unknown"
        from_currency = recurring.account.currency if recurring.account else "JPY"
        to_currency = recurring.to_account.currency if recurring.to_account else "JPY"

        # Outgoing transaction (negative amount from source)
        out_hash = hashlib.sha256(
            f"{transfer_id}|out|{timestamp}".encode()
        ).hexdigest()
        out_tx = Transaction(
            user_id=recurring.user_id,
            account_id=recurring.account_id,
            date=recurring.next_run_date,
            description=recurring.description or f"Transfer to {to_name}",
            amount=-recurring.amount,
            currency=from_currency,
            category="Transfer",
            source=from_name,
            is_income=False,
            is_transfer=True,
            transfer_id=transfer_id,
            transfer_type="outgoing",
            month_key=month_key,
            tx_hash=out_hash,
        )
        db.add(out_tx)

        # Incoming transaction (positive amount to destination)
        in_hash = hashlib.sha256(
            f"{transfer_id}|in|{timestamp}".encode()
        ).hexdigest()
        in_tx = Transaction(
            user_id=recurring.user_id,
            account_id=recurring.to_account_id,
            date=recurring.next_run_date,
            description=recurring.description or f"Transfer from {from_name}",
            amount=recurring.amount,
            currency=to_currency,
            category="Transfer",
            source=to_name,
            is_income=True,
            is_transfer=True,
            transfer_id=transfer_id,
            transfer_type="incoming",
            month_key=month_key,
            tx_hash=in_hash,
        )
        db.add(in_tx)

        created = 2

        # Optional fee transaction
        if recurring.transfer_fee_amount and recurring.transfer_fee_amount > 0:
            fee_hash = hashlib.sha256(
                f"{transfer_id}|fee|{timestamp}".encode()
            ).hexdigest()
            fee_tx = Transaction(
                user_id=recurring.user_id,
                account_id=recurring.account_id,
                date=recurring.next_run_date,
                description="Transfer fee",
                amount=-recurring.transfer_fee_amount,
                currency=from_currency,
                category="Bank Fees",
                source=from_name,
                is_income=False,
                is_transfer=False,
                transfer_id=transfer_id,
                transfer_type="fee",
                month_key=month_key,
                tx_hash=fee_hash,
            )
            db.add(fee_tx)
            created += 1

        return created
