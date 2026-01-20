"""Bill notification mixin for reminder specific logic."""

import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from .notification_service import NotificationService

logger = logging.getLogger(__name__)


class BillNotificationMixin:
    """Mixin to handle bill reminder specific notifications."""

    def __init__(self):
        self.notification_service = NotificationService()

    def send_bill_reminder_notification(
        self, db: Session, bill, reminder_data: dict
    ) -> dict[str, Any]:
        """Send notification for a bill reminder.

        Args:
            db: Database session
            bill: Bill instance
            reminder_data: Dictionary with reminder details

        Returns:
            dict with 'sent' boolean and channel details
        """
        # Build notification content
        title, message, priority, data = self._build_reminder_content(bill, reminder_data)

        # Dispatch via notification service
        results = self.notification_service.send_notification(
            db=db,
            user_id=bill.user_id,
            notification_type="bill_reminder",
            title=title,
            message=message,
            data=data,
            priority=priority,
            action_url=f"/bills/{bill.id}",
            action_label="View Bill",
        )

        # Track sent notifications
        sent_channels = [r for r in results if r.get("status") in ("sent", "created")]

        return {
            "sent": len(sent_channels) > 0,
            "channels": results,
        }

    def _build_reminder_content(self, bill, reminder_data: dict) -> tuple[str, str, int, dict]:
        """Build notification title, message, priority, and data."""
        days_until = reminder_data.get("days_until", 0)
        is_overdue = days_until < 0

        # Calculate remaining balance if partial payment exists
        remaining = bill.amount - (bill.paid_amount or 0)
        is_partial = remaining > 0 and remaining < bill.amount

        if is_overdue:
            title = f"Overdue: {bill.name}"
            message = f"This bill was due {abs(days_until)} day(s) ago. Amount: ¥{bill.amount:,}"
            priority = 1  # Critical
        elif days_until == 0:
            title = f"Due Today: {bill.name}"
            message = f"This bill is due today. Amount: ¥{bill.amount:,}"
            priority = 1  # Critical
        elif days_until == 1:
            title = f"Due Tomorrow: {bill.name}"
            message = f"This bill is due tomorrow. Amount: ¥{bill.amount:,}"
            priority = 2  # High
        elif is_partial:
            title = f"Partial Payment: {bill.name}"
            message = f"Remaining balance: ¥{remaining:,} of ¥{bill.amount:,}"
            priority = 3  # Normal
        else:
            title = f"Bill Reminder: {bill.name}"
            message = f"Due in {days_until} days. Amount: ¥{bill.amount:,}"
            priority = 4  # Low

        # Format due date
        if hasattr(bill.next_due_date, "isoformat"):
            due_date_str = bill.next_due_date.isoformat()
        else:
            due_date_str = str(bill.next_due_date)

        data = {
            "bill_id": bill.id,
            "bill_name": bill.name,
            "amount": bill.amount,
            "remaining_amount": remaining if is_partial else 0,
            "due_date": due_date_str,
            "days_until": days_until,
            "is_partial": is_partial,
            "category": bill.category,
            "reminder_type": reminder_data.get("reminder_type", "simple"),
        }

        return title, message, priority, data

    def check_rate_limit(self, db: Session, user_id: int, channel: str) -> bool:
        """Check if user has exceeded rate limit for a channel.

        Default: Max 3 notifications per hour per channel
        """
        from ..models.notification import NotificationLog
        from datetime import timedelta

        one_hour_ago = datetime.now() - timedelta(hours=1)
        count = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.user_id == user_id,
                NotificationLog.channel == channel,
                NotificationLog.created_at >= one_hour_ago,
            )
            .count()
        )

        return count < 3

    def is_quiet_hours(self, db: Session, user_id: int) -> bool:
        """Check if current time is within user's quiet hours."""
        from ..models.notification import NotificationPreference

        pref = (
            db.query(NotificationPreference)
            .filter(
                NotificationPreference.user_id == user_id,
                NotificationPreference.channel == "push",
            )
            .first()
        )

        if not pref:
            return False

        quiet_hours = pref.settings.get("quiet_hours")
        if not quiet_hours:
            return False

        return self._parse_quiet_hours(quiet_hours)

    def _parse_quiet_hours(self, quiet_hours: str) -> bool:
        """Parse quiet hours string and check if current time is within."""
        try:
            start_str, end_str = quiet_hours.split("-")
            now = datetime.now()
            current_minutes = now.hour * 60 + now.minute

            start_hour, start_minute = map(int, start_str.split(":"))
            end_hour, end_minute = map(int, end_str.split(":"))

            start_minutes = start_hour * 60 + start_minute
            end_minutes = end_hour * 60 + end_minute

            if start_minutes < end_minutes:
                return start_minutes <= current_minutes <= end_minutes
            else:
                return current_minutes >= start_minutes or current_minutes <= end_minutes
        except Exception:
            return False

    def send_partial_payment_alert(self, db: Session, bill) -> dict[str, Any]:
        """Send notification for partial bill payment.

        Args:
            db: Database session
            bill: Bill instance

        Returns:
            dict with 'sent' boolean and channel details
        """
        remaining = bill.amount - (bill.paid_amount or 0)

        title = f"Partial Payment Received: {bill.name}"
        message = f"Received ¥{bill.paid_amount:,} of ¥{bill.amount:,}. Remaining: ¥{remaining:,}"
        priority = 3  # Normal

        due_date_str = (
            bill.next_due_date.isoformat()
            if hasattr(bill.next_due_date, "isoformat")
            else str(bill.next_due_date)
        )

        data = {
            "bill_id": bill.id,
            "bill_name": bill.name,
            "total_amount": bill.amount,
            "paid_amount": bill.paid_amount,
            "remaining_amount": remaining,
            "due_date": due_date_str,
            "category": bill.category,
        }

        results = self.notification_service.send_notification(
            db=db,
            user_id=bill.user_id,
            notification_type="partial_payment",
            title=title,
            message=message,
            data=data,
            priority=priority,
            action_url=f"/bills/{bill.id}",
            action_label="View Bill",
        )

        sent_channels = [r for r in results if r.get("status") in ("sent", "created")]

        return {
            "sent": len(sent_channels) > 0,
            "channels": results,
        }
