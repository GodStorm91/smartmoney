"""Notification mixin for budget alert specific logic."""

import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from .notification_service import NotificationService

logger = logging.getLogger(__name__)


class BudgetNotificationMixin:
    """Mixin to handle budget alert specific notifications."""

    def __init__(self):
        self.notification_service = NotificationService()

    def send_budget_alert_notification(self, db: Session, alert) -> dict[str, Any]:
        """Send notification for a budget alert.

        Args:
            db: Database session
            alert: BudgetAlert instance

        Returns:
            dict with 'sent' boolean and channel details
        """
        # Build notification content based on alert type
        title, message, priority, data = self._build_notification_content(alert)

        # Dispatch via notification service
        results = self.notification_service.send_notification(
            db=db,
            user_id=alert.user_id,
            notification_type="budget_alert",
            title=title,
            message=message,
            data=data,
            priority=priority,
            action_url=f"/budgets/{alert.budget_id}",
            action_label="View Budget",
        )

        # Mark alert as notification_sent if successful
        sent_channels = [r for r in results if r.get("status") in ("sent", "created")]

        if sent_channels:
            alert.notification_sent = True
            db.commit()

        return {
            "sent": len(sent_channels) > 0,
            "channels": results,
        }

    def _build_notification_content(self, alert) -> tuple[str, str, int, dict]:
        """Build notification title, message, priority, and data."""
        category = alert.category or "Overall Budget"

        if alert.alert_type == "over_budget":
            title = f"Over Budget: {category}"
            over_amount = alert.current_spending - alert.budget_amount
            message = f"You've exceeded your {category} budget by ¥{over_amount:,}"
            priority = 1  # Critical
        elif alert.alert_type == "threshold_100":
            title = f"Budget Reached: {category}"
            message = f"You've used 100% of your {category} budget (¥{alert.budget_amount:,})"
            priority = 2  # High
        elif alert.alert_type == "threshold_80":
            title = f"80% Budget Used: {category}"
            remaining = alert.amount_remaining or (alert.budget_amount - alert.current_spending)
            message = f"You've used 80% of your {category} budget. ¥{remaining:,} remaining."
            priority = 3  # Normal
        elif alert.alert_type == "threshold_50":
            title = f"50% Budget Used: {category}"
            remaining = alert.amount_remaining or (alert.budget_amount - alert.current_spending)
            message = f"Halfway through your {category} budget. ¥{remaining:,} remaining."
            priority = 4  # Low
        else:
            title = f"Budget Alert: {category}"
            message = f"Budget update for {category}"
            priority = 4  # Low

        data = {
            "budget_id": alert.budget_id,
            "category": category,
            "alert_type": alert.alert_type,
            "threshold_percentage": float(alert.threshold_percentage),
            "current_spending": alert.current_spending,
            "budget_amount": alert.budget_amount,
        }

        return title, message, priority, data

    def check_rate_limit(self, db: Session, user_id: int, channel: str) -> bool:
        """Check if user has exceeded rate limit for a channel.

        Default: Max 3 notifications per hour per channel
        """
        from ..models.notification import NotificationLog
        from datetime import timedelta

        # Count notifications in last hour
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

        return count < 3  # Allow max 3 per hour

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
