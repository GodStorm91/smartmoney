"""Scheduled job for generating pending actions."""

import logging

from sqlalchemy.orm import Session

from ..models.user import User
from .action_service import get_action_service

logger = logging.getLogger(__name__)


class ActionGenerationJob:
    """Daily job to generate pending actions for all active users."""

    def run(self, db: Session) -> dict:
        """Generate actions for all users and expire stale ones."""
        service = get_action_service()

        # Expire stale actions first
        expired = service.expire_stale_actions(db)
        if expired:
            logger.info(f"Expired {expired} stale actions")

        # Generate for each active user
        users = db.query(User).filter(User.is_active == True).all()
        total_created = 0
        errors = 0

        for user in users:
            try:
                created = service.generate_actions(db, user.id)
                total_created += created
                if created:
                    logger.info(f"User {user.id}: created {created} action(s)")
            except Exception as e:
                db.rollback()
                errors += 1
                logger.error(f"Action generation failed for user {user.id}: {e}")

        return {"users": len(users), "created": total_created, "expired": expired, "errors": errors}
