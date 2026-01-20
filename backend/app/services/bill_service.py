"""Bill reminder service for CRUD operations and recurrence calculations."""

from datetime import date, datetime, timedelta, time as dt_time
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from ..models.bill import Bill, BillHistory
from ..models.recurring_transaction import RecurringTransaction


class BillReminderService:
    """Service for bill reminder operations."""

    # Valid reminder days
    VALID_REMINDER_DAYS = (1, 3, 7)

    @staticmethod
    def calculate_next_due_date(
        last_paid_date: Optional[date],
        due_day: int,
        recurrence_type: str,
        recurrence_config: Optional[dict] = None,
    ) -> date:
        """Calculate next due date based on recurrence pattern.

        Args:
            last_paid_date: The date the bill was last paid
            due_day: Day of month the bill is due (1-31)
            recurrence_type: weekly, biweekly, monthly, quarterly, yearly, custom
            recurrence_config: Additional recurrence configuration

        Returns:
            Next due date
        """
        today = date.today()
        base_date = last_paid_date if last_paid_date else today

        if recurrence_type == "weekly":
            # Add 7 days from last paid date
            next_date = base_date + timedelta(weeks=1)
        elif recurrence_type == "biweekly":
            # Add 2 weeks from last paid date
            next_date = base_date + timedelta(weeks=2)
        elif recurrence_type == "monthly":
            # Move to same day next month
            year = base_date.year
            month = base_date.month + 1
            if month > 12:
                month = 1
                year += 1
            # Handle months with fewer days
            last_day = (
                (date(year, month + 1, 1) - timedelta(days=1)).day
                if month < 12
                else (date(year + 1, 1, 1) - timedelta(days=1)).day
            )
            next_day = min(due_day, last_day)
            next_date = date(year, month, next_day)
        elif recurrence_type == "quarterly":
            # Add 3 months
            year = base_date.year
            month = base_date.month + 3
            if month > 12:
                month -= 12
                year += 1
            last_day = (
                (date(year, month + 1, 1) - timedelta(days=1)).day
                if month < 12
                else (date(year + 1, 1, 1) - timedelta(days=1)).day
            )
            next_day = min(due_day, last_day)
            next_date = date(year, month, next_day)
        elif recurrence_type == "yearly":
            # Add 1 year
            year = base_date.year + 1
            # Handle Feb 29 -> Feb 28 for non-leap years
            try:
                next_date = date(year, base_date.month, base_date.day)
            except ValueError:
                next_date = date(year, base_date.month, 28)
        elif recurrence_type == "custom" and recurrence_config:
            # Custom interval in days
            interval_days = recurrence_config.get("interval_days", 30)
            next_date = base_date + timedelta(days=interval_days)
        else:
            # Default to monthly
            year = base_date.year
            month = base_date.month + 1
            if month > 12:
                month = 1
                year += 1
            last_day = (
                (date(year, month + 1, 1) - timedelta(days=1)).day
                if month < 12
                else (date(year + 1, 1, 1) - timedelta(days=1)).day
            )
            next_day = min(due_day, last_day)
            next_date = date(year, month, next_day)

        return next_date

    @staticmethod
    def get_bills(
        db: Session,
        user_id: int,
        category: Optional[str] = None,
        recurring_only: Optional[bool] = None,
        is_active: bool = True,
    ) -> list[Bill]:
        """Get bills for a user with optional filters."""
        query = db.query(Bill).filter(Bill.user_id == user_id, Bill.is_active == is_active)

        if category:
            query = query.filter(Bill.category == category)
        if recurring_only is not None:
            query = query.filter(Bill.is_recurring == recurring_only)

        return query.order_by(Bill.next_due_date).all()

    @staticmethod
    def get_bill(db: Session, bill_id: int, user_id: int) -> Optional[Bill]:
        """Get a single bill by ID."""
        return db.query(Bill).filter(Bill.id == bill_id, Bill.user_id == user_id).first()

    @staticmethod
    def create_bill(db: Session, user_id: int, bill_data: dict) -> Bill:
        """Create a new bill."""
        # Calculate next_due_date if not provided
        if "next_due_date" not in bill_data or bill_data["next_due_date"] is None:
            bill_data["next_due_date"] = BillReminderService.calculate_next_due_date(
                bill_data.get("last_paid_date"),
                bill_data["due_day"],
                bill_data.get("recurrence_type", "monthly"),
                bill_data.get("recurrence_config"),
            )

        bill = Bill(user_id=user_id, **bill_data)
        db.add(bill)
        db.commit()
        db.refresh(bill)
        return bill

    @staticmethod
    def update_bill(db: Session, bill_id: int, user_id: int, bill_data: dict) -> Optional[Bill]:
        """Update a bill."""
        bill = BillReminderService.get_bill(db, bill_id, user_id)
        if not bill:
            return None

        # If recurrence data changed, recalculate next_due_date
        if any(k in bill_data for k in ["due_day", "recurrence_type", "recurrence_config"]):
            bill_data["next_due_date"] = BillReminderService.calculate_next_due_date(
                bill_data.get("last_paid_date", bill.last_paid_date),
                bill_data.get("due_day", bill.due_day),
                bill_data.get("recurrence_type", bill.recurrence_type),
                bill_data.get("recurrence_config", bill.recurrence_config),
            )

        for key, value in bill_data.items():
            setattr(bill, key, value)

        db.commit()
        db.refresh(bill)
        return bill

    @staticmethod
    def delete_bill(db: Session, bill_id: int, user_id: int) -> bool:
        """Soft delete a bill (set is_active=False)."""
        bill = BillReminderService.get_bill(db, bill_id, user_id)
        if not bill:
            return False

        bill.is_active = False
        db.commit()
        return True

    @staticmethod
    def get_calendar_bills(db: Session, user_id: int, year: int, month: int) -> dict:
        """Get bills for calendar view by month."""
        # Calculate month end date
        if month < 12:
            month_end = date(year, month + 1, 1) - timedelta(days=1)
        else:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)

        # Get all bills due in the specified month
        bills = (
            db.query(Bill)
            .filter(
                Bill.user_id == user_id,
                Bill.is_active == True,
                Bill.next_due_date >= date(year, month, 1),
                Bill.next_due_date <= month_end,
            )
            .all()
        )

        # Organize by day
        days = {}
        for day in range(1, 32):
            try:
                check_date = date(year, month, day) if month <= 12 else date(year + 1, 1, day)
                days[day] = {"day": day, "bills": []}
            except ValueError:
                break

        total_bills_due = 0
        total_amount_due = 0

        for bill in bills:
            day = bill.next_due_date.day
            if day in days:
                days[day]["bills"].append(bill)
                if not bill.is_paid:
                    total_bills_due += 1
                    total_amount_due += bill.amount

        return {
            "year": year,
            "month": month,
            "days": list(days.values()),
            "total_bills_due": total_bills_due,
            "total_amount_due": total_amount_due,
        }

    @staticmethod
    def get_upcoming_bills(db: Session, user_id: int, days_ahead: int = 7) -> list[Bill]:
        """Get upcoming bills within specified days."""
        today = date.today()
        end_date = today + timedelta(days=days_ahead)

        return (
            db.query(Bill)
            .filter(
                Bill.user_id == user_id,
                Bill.is_active == True,
                Bill.next_due_date >= today,
                Bill.next_due_date <= end_date,
                Bill.is_paid == False,
            )
            .order_by(Bill.next_due_date)
            .all()
        )

    @staticmethod
    def mark_as_paid(
        db: Session,
        bill_id: int,
        user_id: int,
        paid_date: Optional[date] = None,
        amount_paid: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> tuple[Optional[Bill], Optional[BillHistory]]:
        """Mark a bill as paid and create history entry."""
        bill = BillReminderService.get_bill(db, bill_id, user_id)
        if not bill:
            return None, None

        paid = paid_date or date.today()
        amount = amount_paid or bill.amount

        # Create history entry
        history = BillHistory(bill_id=bill_id, paid_date=paid, amount_paid=amount, notes=notes)
        db.add(history)

        # Update bill
        bill.is_paid = True
        bill.last_paid_date = paid
        bill.paid_amount = amount

        # Calculate next due date
        bill.next_due_date = BillReminderService.calculate_next_due_date(
            paid, bill.due_day, bill.recurrence_type, bill.recurrence_config
        )

        db.commit()
        db.refresh(bill)
        return bill, history

    @staticmethod
    def mark_as_unpaid(db: Session, bill_id: int, user_id: int) -> Optional[Bill]:
        """Mark a bill as unpaid (undo payment)."""
        bill = BillReminderService.get_bill(db, bill_id, user_id)
        if not bill:
            return None

        bill.is_paid = False
        bill.paid_amount = None

        db.commit()
        db.refresh(bill)
        return bill

    @staticmethod
    def get_bills_for_reminder_check(db: Session) -> list[Bill]:
        """Get all bills eligible for reminder notification."""
        today = date.today()

        return (
            db.query(Bill)
            .filter(
                Bill.is_active == True,
                Bill.reminder_enabled == True,
                Bill.is_paid == False,
            )
            .all()
        )

    @staticmethod
    def update_last_reminder_sent(db: Session, bill_id: int):
        """Update the last_reminder_sent timestamp."""
        bill = db.query(Bill).filter(Bill.id == bill_id).first()
        if bill:
            bill.last_reminder_sent = datetime.now()
            db.commit()

    @staticmethod
    def create_bill_from_recurring(db: Session, recurring: RecurringTransaction) -> Optional[Bill]:
        """Create a bill reminder from a recurring transaction.

        This is called when auto_create_bill_reminders is enabled.
        """
        # Check if bill already exists for this recurring transaction
        existing = db.query(Bill).filter(Bill.recurring_transaction_id == recurring.id).first()

        if existing:
            # Update existing bill
            BillReminderService.update_bill(
                db,
                existing.id,
                recurring.user_id,
                {
                    "name": recurring.description,
                    "amount": recurring.amount,
                    "category": recurring.category,
                    "due_day": recurring.day_of_month or 1,
                    "recurrence_type": BillReminderService._map_frequency_to_recurrence(
                        recurring.frequency
                    ),
                    "recurrence_config": BillReminderService._build_recurrence_config(recurring),
                },
            )
            existing.last_synced_at = datetime.now()
            db.commit()
            return existing

        # Create new bill
        bill_data = {
            "name": recurring.description,
            "amount": recurring.amount,
            "category": recurring.category,
            "due_day": recurring.day_of_month or 1,
            "recurrence_type": BillReminderService._map_frequency_to_recurrence(
                recurring.frequency
            ),
            "recurrence_config": BillReminderService._build_recurrence_config(recurring),
            "next_due_date": recurring.next_run_date,
            "reminder_days_before": 3,
            "reminder_enabled": True,
            "recurring_transaction_id": recurring.id,
            "sync_with_recurring": True,
        }

        return BillReminderService.create_bill(db, recurring.user_id, bill_data)

    @staticmethod
    def _map_frequency_to_recurrence(frequency: str) -> str:
        """Map recurring transaction frequency to bill recurrence type."""
        mapping = {
            "daily": "weekly",
            "weekly": "weekly",
            "biweekly": "biweekly",
            "monthly": "monthly",
            "yearly": "yearly",
        }
        return mapping.get(frequency, "monthly")

    @staticmethod
    def _build_recurrence_config(recurring: RecurringTransaction) -> dict | None:
        """Build recurrence config from recurring transaction."""
        config = {}
        if recurring.interval_days:
            config["interval_days"] = recurring.interval_days
        if recurring.day_of_week is not None:
            config["day_of_week"] = recurring.day_of_week
        if recurring.month_of_year:
            config["month_of_year"] = recurring.month_of_year
        return config if config else None

    # === Reminder Schedule Methods ===

    @staticmethod
    def create_reminder_schedule(
        db: Session, bill_id: int, user_id: int, schedule_data: dict
    ) -> "BillReminderSchedule":
        """Create a custom reminder schedule for a bill."""
        from ..models.notification import BillReminderSchedule

        bill = BillReminderService.get_bill(db, bill_id, user_id)
        if not bill:
            raise ValueError("Bill not found")

        # Calculate reminder_time from due_date and schedule config
        due_date = bill.next_due_date
        reminder_time = BillReminderService._calculate_schedule_time(
            due_date,
            schedule_data.get("days_before", 3),
            schedule_data.get("reminder_time", dt_time(9, 0)),
        )

        schedule = BillReminderSchedule(
            bill_id=bill_id,
            reminder_type=schedule_data.get("reminder_type", "days_before"),
            days_before=schedule_data.get("days_before"),
            reminder_time=reminder_time,
            recurrence_config=schedule_data.get("recurrence_config"),
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        return schedule

    @staticmethod
    def get_reminder_schedules(db: Session, bill_id: int) -> list["BillReminderSchedule"]:
        """Get all reminder schedules for a bill."""
        from ..models.notification import BillReminderSchedule

        return (
            db.query(BillReminderSchedule)
            .filter(BillReminderSchedule.bill_id == bill_id)
            .order_by(BillReminderSchedule.reminder_time)
            .all()
        )

    @staticmethod
    def delete_reminder_schedule(db: Session, schedule_id: int, user_id: int) -> bool:
        """Delete a reminder schedule."""
        from ..models.notification import BillReminderSchedule
        from ..models.bill import Bill

        schedule = (
            db.query(BillReminderSchedule)
            .join(Bill)
            .filter(
                BillReminderSchedule.id == schedule_id,
                Bill.user_id == user_id,
            )
            .first()
        )

        if schedule:
            db.delete(schedule)
            db.commit()
            return True
        return False

    @staticmethod
    def _calculate_schedule_time(
        due_date: date, days_before: int, reminder_time: dt_time
    ) -> datetime:
        """Calculate the datetime for a reminder schedule."""
        reminder_date = due_date - timedelta(days=days_before)
        return datetime.combine(reminder_date, reminder_time)

    # === Partial Payment Methods ===

    @staticmethod
    def get_partial_payment_status(db: Session, bill_id: int, user_id: int) -> dict:
        """Calculate partial payment status for a bill."""
        bill = BillReminderService.get_bill(db, bill_id, user_id)
        if not bill:
            raise ValueError("Bill not found")

        total_amount = bill.amount
        paid_amount = bill.paid_amount or 0
        remaining_amount = max(0, total_amount - paid_amount)
        is_fully_paid = remaining_amount == 0
        has_partial_payment = 0 < paid_amount < total_amount

        return {
            "bill_id": bill_id,
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "remaining_amount": remaining_amount,
            "is_fully_paid": is_fully_paid,
            "has_partial_payment": has_partial_payment,
        }

    @staticmethod
    def should_alert_partial_payment(db: Session, bill_id: int, user_id: int) -> bool:
        """Check if a partial payment alert should be sent."""
        from ..models.notification import BillReminderSchedule
        from datetime import timedelta

        bill = BillReminderService.get_bill(db, bill_id, user_id)
        if not bill:
            return False

        # Alert if partially paid and not fully paid
        if bill.paid_amount and 0 < bill.paid_amount < bill.amount:
            # Only alert if not already alerted recently (within 24 hours)
            last_alert = (
                db.query(BillReminderSchedule)
                .filter(
                    BillReminderSchedule.bill_id == bill_id,
                    BillReminderSchedule.reminder_type == "partial_payment",
                )
                .order_by(BillReminderSchedule.created_at.desc())
                .first()
            )

            if last_alert and last_alert.created_at > datetime.now() - timedelta(hours=24):
                return False

            return True

        return False
