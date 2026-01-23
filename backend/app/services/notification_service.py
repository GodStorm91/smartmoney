"""Notification service for multi-channel notifications."""

import asyncio
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from ..config import settings
from ..models import (
    InAppNotification,
    NotificationLog,
    NotificationPreference,
    PushSubscription,
    User,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Multi-channel notification service (push, email, in-app)."""

    def __init__(self):
        self.fcm_api_url = "https://fcm.googleapis.com/fcm/send"
        # FCM server key would be loaded from settings in production
        self.fcm_server_key = getattr(settings, "FCM_SERVER_KEY", None)

    async def send_notification(
        self,
        db: Session,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        data: dict[str, Any] | None = None,
        priority: int = 3,
        action_url: str | None = None,
        action_label: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Send notification to user across all enabled channels.

        Args:
            db: Database session
            user_id: Target user ID
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Optional data payload
            priority: Priority level (1=critical, 2=high, 3=normal, 4=low)
            action_url: URL for notification action
            action_label: Label for action button

        Returns:
            List of results from each channel
        """
        # Get user's notification preferences
        preferences = self._get_user_preferences(db, user_id)

        # Rate limiting check - global limit (max 10 per hour)
        if not self._check_rate_limit(db, user_id, notification_type):
            logger.warning(
                f"Rate limit exceeded for user {user_id}, notification type {notification_type}"
            )
            return [{"channel": "rate_limit", "status": "skipped", "reason": "rate_limit_exceeded"}]

        channels = []
        if preferences.get("push", True):
            channels.append("push")
        if preferences.get("email", False):
            channels.append("email")
        if preferences.get("in_app", True):
            channels.append("in_app")

        # Quiet hours check
        if self._is_quiet_hours(preferences):
            # Only send critical notifications during quiet hours
            if priority > 2:
                channels = ["in_app"]  # Only in-app during quiet hours
            else:
                # Queue critical notifications for after quiet hours
                self._queue_notification(
                    db,
                    user_id,
                    notification_type,
                    title,
                    message,
                    data,
                    priority,
                    action_url,
                    action_label,
                )
                return [{"channel": "quiet_hours", "status": "queued"}]

        results = []

        # Send to each enabled channel
        for channel in channels:
            # Additional rate limit check per channel (max 3 per hour per channel)
            if not self._check_channel_rate_limit(db, user_id, channel):
                results.append(
                    {"channel": channel, "status": "skipped", "reason": "channel_rate_limit"}
                )
                continue

            try:
                if channel == "push":
                    result = await self._send_push_notification(
                        db, user_id, title, message, data, notification_type
                    )
                elif channel == "email":
                    result = await self._send_email_notification(
                        db, user_id, title, message, data, notification_type
                    )
                elif channel == "in_app":
                    result = await self._create_in_app_notification(
                        db,
                        user_id,
                        notification_type,
                        title,
                        message,
                        data,
                        priority,
                        action_url,
                        action_label,
                    )
                else:
                    result = {"channel": channel, "status": "unknown"}
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to send {channel} notification: {e}")
                results.append({"channel": channel, "status": "failed", "error": str(e)})

        return results

    def _get_user_preferences(self, db: Session, user_id: int) -> dict[str, bool]:
        """Get user's notification channel preferences."""
        prefs = (
            db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).all()
        )

        result = {"push": True, "email": False, "in_app": True}
        for pref in prefs:
            result[pref.channel] = pref.enabled

        return result

    def _is_quiet_hours(self, preferences: dict[str, Any]) -> bool:
        """Check if current time is within user's quiet hours."""
        settings_data = preferences.get("settings", {})
        quiet_hours = settings_data.get("quiet_hours")

        if not quiet_hours:
            return False

        try:
            # Parse quiet hours (e.g., "22:00-07:00")
            start_str, end_str = quiet_hours.split("-")
            now = datetime.now()
            current_minutes = now.hour * 60 + now.minute

            start_hour, start_minute = map(int, start_str.split(":"))
            end_hour, end_minute = map(int, end_str.split(":"))

            start_minutes = start_hour * 60 + start_minute
            end_minutes = end_hour * 60 + end_minute

            if start_minutes < end_minutes:
                # Normal range (e.g., 09:00-17:00)
                return start_minutes <= current_minutes <= end_minutes
            else:
                # Overnight range (e.g., 22:00-07:00)
                return current_minutes >= start_minutes or current_minutes <= end_minutes
        except Exception:
            return False

    def _check_rate_limit(self, db: Session, user_id: int, notification_type: str) -> bool:
        """Check if user has exceeded global rate limit.

        Default: Max 10 notifications per hour total
        """
        from ..models.notification import NotificationLog
        from datetime import timedelta

        one_hour_ago = datetime.now() - timedelta(hours=1)
        count = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.user_id == user_id,
                NotificationLog.created_at >= one_hour_ago,
            )
            .count()
        )

        return count < 10

    def _check_channel_rate_limit(self, db: Session, user_id: int, channel: str) -> bool:
        """Check if user has exceeded channel-specific rate limit.

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

    def _queue_notification(
        self,
        db: Session,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        data: dict[str, Any] | None,
        priority: int,
        action_url: str | None,
        action_label: str | None,
    ) -> None:
        """Queue notification for delivery after quiet hours.

        Stores in database for processing by background job.
        """
        from ..models.notification import QueuedNotification

        queued = QueuedNotification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {},
            priority=priority,
            action_url=action_url,
            action_label=action_label,
            next_attempt_at=datetime.now(),  # Will be processed by background job
        )
        db.add(queued)
        db.commit()

    async def _send_push_notification(
        self,
        db: Session,
        user_id: int,
        title: str,
        body: str,
        data: dict[str, Any] | None,
        notification_type: str,
    ) -> dict[str, Any]:
        """Send push notification via FCM."""
        subscriptions = (
            db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active == True,
            )
            .all()
        )

        if not subscriptions:
            return {"channel": "push", "status": "no_subscriptions"}

        fcm_messages = []
        for sub in subscriptions:
            message = {
                "to": sub.endpoint,
                "notification": {"title": title, "body": body},
                "data": {
                    "type": notification_type,
                    **(data or {}),
                },
                "webpush": {
                    "headers": {
                        "TTL": "86400",
                    },
                    "fcm_options": {
                        "link": data.get("action_url") if data else None,
                    },
                },
            }
            fcm_messages.append(message)

        # In production, this would make actual FCM API calls
        # For now, we'll simulate successful push
        for sub in subscriptions:
            log = NotificationLog(
                user_id=user_id,
                channel="push",
                notification_type=notification_type,
                title=title,
                message=body,
                status="sent",
                metadata={"subscription_id": sub.id},
                sent_at=datetime.now(),
            )
            db.add(log)

        db.commit()

        return {
            "channel": "push",
            "status": "sent",
            "recipients": len(subscriptions),
        }

    async def _send_email_notification(
        self,
        db: Session,
        user_id: int,
        title: str,
        body: str,
        data: dict[str, Any] | None,
        notification_type: str,
    ) -> dict[str, Any]:
        """Send email notification via SendGrid."""
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            return {"channel": "email", "status": "user_not_found"}

        # In production, this would use SendGrid API
        # For now, we'll simulate email sending
        log = NotificationLog(
            user_id=user_id,
            channel="email",
            notification_type=notification_type,
            title=title,
            message=body,
            status="sent",
            metadata={"email": user.email},
            sent_at=datetime.now(),
        )
        db.add(log)
        db.commit()

        return {
            "channel": "email",
            "status": "sent",
            "recipient": user.email,
        }

    async def _create_in_app_notification(
        self,
        db: Session,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        data: dict[str, Any] | None,
        priority: int,
        action_url: str | None,
        action_label: str | None,
    ) -> dict[str, Any]:
        """Create in-app notification."""
        notification = InAppNotification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            data=data or {},
            priority=priority,
            action_url=action_url,
            action_label=action_label,
        )
        db.add(notification)

        # Also log it
        log = NotificationLog(
            user_id=user_id,
            notification_id=notification.id,
            channel="in_app",
            notification_type=notification_type,
            title=title,
            message=message,
            status="created",
        )
        db.add(log)

        db.commit()
        db.refresh(notification)

        return {
            "channel": "in_app",
            "status": "created",
            "notification_id": notification.id,
        }

    async def get_user_notifications(
        self,
        db: Session,
        user_id: int,
        limit: int = 20,
        unread_only: bool = False,
    ) -> list[InAppNotification]:
        """Get user's notifications."""
        query = db.query(InAppNotification).filter(InAppNotification.user_id == user_id)

        if unread_only:
            query = query.filter(InAppNotification.is_read == False)

        return query.order_by(InAppNotification.created_at.desc()).limit(limit).all()

    async def mark_notification_read(self, db: Session, user_id: int, notification_id: int) -> bool:
        """Mark a notification as read."""
        notification = (
            db.query(InAppNotification)
            .filter(
                InAppNotification.id == notification_id,
                InAppNotification.user_id == user_id,
            )
            .first()
        )

        if notification:
            notification.is_read = True
            notification.read_at = datetime.now()
            db.commit()
            return True

        return False

    async def mark_all_read(self, db: Session, user_id: int) -> int:
        """Mark all notifications as read for a user."""
        count = (
            db.query(InAppNotification)
            .filter(
                InAppNotification.user_id == user_id,
                InAppNotification.is_read == False,
            )
            .update({"is_read": True, "read_at": datetime.now()})
        )
        db.commit()
        return count

    async def get_unread_count(self, db: Session, user_id: int) -> int:
        """Get count of unread notifications."""
        return (
            db.query(InAppNotification)
            .filter(
                InAppNotification.user_id == user_id,
                InAppNotification.is_read == False,
            )
            .count()
        )

    async def delete_notification(self, db: Session, user_id: int, notification_id: int) -> bool:
        """Delete a notification."""
        notification = (
            db.query(InAppNotification)
            .filter(
                InAppNotification.id == notification_id,
                InAppNotification.user_id == user_id,
            )
            .first()
        )

        if notification:
            db.delete(notification)
            db.commit()
            return True

        return False

    async def delete_old_notifications(self, db: Session, days: int = 30) -> int:
        """Delete notifications older than specified days."""
        from datetime import timedelta

        cutoff = datetime.now() - timedelta(days=days)

        count = (
            db.query(InAppNotification)
            .filter(
                InAppNotification.created_at < cutoff,
                InAppNotification.is_read == True,
            )
            .delete()
        )
        db.commit()
        return count


class NotificationPreferenceService:
    """Service for managing user notification preferences."""

    def get_preferences(self, db: Session, user_id: int) -> dict[str, dict[str, Any]]:
        """Get all notification preferences for a user."""
        prefs = (
            db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).all()
        )

        result = {}
        for pref in prefs:
            result[pref.channel] = {
                "enabled": pref.enabled,
                "settings": pref.settings,
            }

        # Fill in defaults for missing channels
        for channel in ["push", "email", "in_app"]:
            if channel not in result:
                result[channel] = {
                    "enabled": channel != "email",  # Email opt-in only
                    "settings": {},
                }

        return result

    def update_preference(
        self,
        db: Session,
        user_id: int,
        channel: str,
        enabled: bool,
        settings: dict[str, Any] | None = None,
    ) -> NotificationPreference:
        """Update a notification channel preference."""
        pref = (
            db.query(NotificationPreference)
            .filter(
                NotificationPreference.user_id == user_id,
                NotificationPreference.channel == channel,
            )
            .first()
        )

        if pref:
            pref.enabled = enabled
            if settings:
                pref.settings = settings
            pref.updated_at = datetime.now()
        else:
            pref = NotificationPreference(
                user_id=user_id,
                channel=channel,
                enabled=enabled,
                settings=settings or {},
            )
            db.add(pref)

        db.commit()
        db.refresh(pref)
        return pref

    def reset_to_defaults(self, db: Session, user_id: int) -> None:
        """Reset all preferences to defaults."""
        # Delete existing preferences
        db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).delete()

        # Create defaults
        defaults = [
            ("push", True, {}),
            ("email", False, {}),
            ("in_app", True, {}),
        ]

        for channel, enabled, settings in defaults:
            pref = NotificationPreference(
                user_id=user_id,
                channel=channel,
                enabled=enabled,
                settings=settings,
            )
            db.add(pref)

        db.commit()


class PushSubscriptionService:
    """Service for managing push notification subscriptions."""

    def subscribe(
        self,
        db: Session,
        user_id: int,
        endpoint: str,
        p256dh: str,
        auth: str,
        browser: str,
    ) -> PushSubscription:
        """Create or update a push subscription."""
        existing = (
            db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint,
            )
            .first()
        )

        if existing:
            existing.p256dh = p256dh
            existing.auth = auth
            existing.browser = browser
            existing.is_active = True
            existing.updated_at = datetime.now()
            db.commit()
            db.refresh(existing)
            return existing

        subscription = PushSubscription(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            browser=browser,
            is_active=True,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        return subscription

    def unsubscribe(self, db: Session, user_id: int, endpoint: str) -> bool:
        """Deactivate a push subscription."""
        subscription = (
            db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint,
            )
            .first()
        )

        if subscription:
            subscription.is_active = False
            subscription.updated_at = datetime.now()
            db.commit()
            return True

        return False

    def get_active_subscriptions(self, db: Session, user_id: int) -> list[PushSubscription]:
        """Get all active push subscriptions for a user."""
        return (
            db.query(PushSubscription)
            .filter(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active == True,
            )
            .all()
        )
