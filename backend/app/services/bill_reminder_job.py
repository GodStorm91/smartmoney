"""Background job for processing bill reminders."""

import logging
from datetime import date, datetime, time as dt_time, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from .bill_service import BillReminderService
from .bill_notification_mixin import BillNotificationMixin
from ..models.bill import BillReminderSchedule

logger = logging.getLogger(__name__)


class BillReminderJob:
    """Job to check and send bill reminders."""

    def __init__(self):
        self.notification_mixin = BillNotificationMixin()

    def process_reminders(self, db: Session) -> dict:
        """Process all bill reminders due for sending.

        Returns:
            dict with 'bills_checked', 'reminders_sent', and 'errors' counts
        """
        today = date.today()
        now = datetime.now()

        # Get all bills eligible for reminder check
        bills = BillReminderService.get_bills_for_reminder_check(db)

        reminders_sent = 0
        errors = 0

        for bill in bills:
            try:
                result = self._process_bill_reminder(db, bill, today, now)
                reminders_sent += result["sent"]
            except Exception as e:
                logger.error(f"Error processing bill {bill.id}: {e}")
                errors += 1

        return {
            "bills_checked": len(bills),
            "reminders_sent": reminders_sent,
            "errors": errors,
        }

    def _process_bill_reminder(self, db: Session, bill, today: date, now: datetime) -> dict:
        """Process reminders for a single bill."""
        result = {"sent": 0}

        # Check simple reminder (days before)
        simple_result = self._check_simple_reminder(db, bill, today, now)
        if simple_result["should_send"]:
            notification_result = self.notification_mixin.send_bill_reminder_notification(
                db, bill, simple_result["reminder_data"]
            )
            if notification_result.get("sent"):
                BillReminderService.update_last_reminder_sent(db, bill.id)
                result["sent"] += 1

        # Check custom schedules
        schedule_results = self._check_custom_schedules(db, bill, today, now)
        for schedule_data in schedule_results:
            if schedule_data["should_send"]:
                notification_result = self.notification_mixin.send_bill_reminder_notification(
                    db, bill, schedule_data["reminder_data"]
                )
                if notification_result.get("sent"):
                    self._mark_schedule_sent(db, schedule_data["schedule_id"])
                    result["sent"] += 1

        return result

    def _check_simple_reminder(self, db: Session, bill, today: date, now: datetime) -> dict:
        """Check if simple reminder should be sent based on reminder_days_before."""
        # Skip if reminders disabled
        if not bill.reminder_enabled:
            return {"should_send": False}

        # Skip if already sent today (prevent duplicates)
        if bill.last_reminder_sent and bill.last_reminder_sent.date() == today:
            return {"should_send": False}

        # Calculate reminder date
        reminder_date = self._calculate_reminder_date(bill.next_due_date, bill.reminder_days_before)

        # Check if today is the reminder date
        if today < reminder_date:
            return {"should_send": False}

        # Check if due time has passed today
        if today == reminder_date and bill.due_time:
            if now.time() < bill.due_time:
                return {"should_send": False}

        days_until = (bill.next_due_date - today).days

        return {
            "should_send": True,
            "reminder_data": {
                "days_until": days_until,
                "reminder_type": "simple",
                "reminder_date": str(reminder_date),
            },
        }

    def _check_custom_schedules(self, db: Session, bill, today: date, now: datetime) -> list[dict]:
        """Check all custom reminder schedules for a bill."""
        schedules = (
            db.query(BillReminderSchedule)
            .filter(
                BillReminderSchedule.bill_id == bill.id,
                BillReminderSchedule.is_sent == False,
            )
            .all()
        )

        results = []
        for schedule in schedules:
            # Check if schedule time has passed
            if schedule.reminder_time > now:
                results.append(
                    {
                        "should_send": False,
                        "schedule_id": schedule.id,
                        "reminder_data": {},
                    }
                )
                continue

            # Calculate days until due
            days_until = (bill.next_due_date - today).days

            results.append(
                {
                    "should_send": True,
                    "schedule_id": schedule.id,
                    "reminder_data": {
                        "days_until": days_until,
                        "reminder_type": schedule.reminder_type,
                        "schedule_id": schedule.id,
                        "custom_time": schedule.reminder_time.isoformat(),
                    },
                }
            )

        return results

    def _mark_schedule_sent(self, db: Session, schedule_id: int):
        """Mark a schedule as sent and create next occurrence."""
        schedule = (
            db.query(BillReminderSchedule).filter(BillReminderSchedule.id == schedule_id).first()
        )
        if schedule:
            schedule.is_sent = True
            schedule.sent_at = datetime.now()

            # If recurring schedule, create next occurrence
            if schedule.reminder_type == "recurring":
                next_time = self._calculate_next_recurring_time(
                    schedule.reminder_time, schedule.recurrence_config
                )
                new_schedule = BillReminderSchedule(
                    bill_id=schedule.bill_id,
                    reminder_type="recurring",
                    reminder_time=next_time,
                    recurrence_config=schedule.recurrence_config,
                )
                db.add(new_schedule)

            db.commit()

    def _calculate_reminder_date(self, due_date: date, days_before: int) -> date:
        """Calculate the reminder date based on due date and days before."""
        return due_date - timedelta(days=days_before)

    def _calculate_next_recurring_time(
        self, last_time: datetime, config: Optional[dict]
    ) -> datetime:
        """Calculate next occurrence time for recurring reminders."""
        if not config:
            return last_time + timedelta(days=1)

        interval = config.get("interval_days", 1)
        return last_time + timedelta(days=interval)
