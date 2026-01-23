"""Background job for processing queued notifications."""

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .notification_service import NotificationService

logger = logging.getLogger(__name__)


class QueuedNotificationJob:
    """Job to process queued notifications after quiet hours or rate limits."""

    def __init__(self):
        self.notification_service = NotificationService()

    def process_queue(self, db: Session) -> dict:
        """Process pending queued notifications.

        Returns:
            dict with 'processed' and 'failed' counts
        """
        from ..models.notification import QueuedNotification

        # Get notifications ready for processing
        queued = (
            db.query(QueuedNotification)
            .filter(
                QueuedNotification.completed_at == None,
                QueuedNotification.next_attempt_at <= datetime.now(),
                QueuedNotification.attempts < QueuedNotification.max_attempts,
            )
            .order_by(QueuedNotification.priority.asc(), QueuedNotification.next_attempt_at.asc())
            .limit(100)  # Process up to 100 at a time
            .all()
        )

        processed = 0
        failed = 0

        for item in queued:
            try:
                results = self.notification_service.send_notification(
                    db=db,
                    user_id=item.user_id,
                    notification_type=item.notification_type,
                    title=item.title,
                    message=item.message,
                    data=item.data,
                    priority=item.priority,
                    action_url=item.action_url,
                    action_label=item.action_label,
                )

                # Check if all channels succeeded
                sent_channels = [r for r in results if r.get("status") in ("sent", "created")]

                if sent_channels:
                    item.completed_at = datetime.now()
                    processed += 1
                else:
                    # Schedule retry
                    item.attempts += 1
                    item.next_attempt_at = datetime.now() + timedelta(
                        minutes=15 * (item.attempts**2)
                    )
                    item.error_message = "All channels failed"

                    if item.attempts >= item.max_attempts:
                        item.completed_at = datetime.now()
                        item.error_message = "Max attempts reached"
                        failed += 1

            except Exception as e:
                logger.error(f"Failed to process queued notification {item.id}: {e}")
                item.attempts += 1
                item.error_message = str(e)
                item.next_attempt_at = datetime.now() + timedelta(minutes=15 * (item.attempts**2))

                if item.attempts >= item.max_attempts:
                    item.completed_at = datetime.now()
                    failed += 1

        db.commit()

        return {
            "processed": processed,
            "failed": failed,
            "remaining": len(queued) - processed - failed,
        }
