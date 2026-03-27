"""Shared utilities for action generators."""

import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.pending_action import PendingAction

logger = logging.getLogger(__name__)


def safe_add_action(db: Session, action: PendingAction) -> bool:
    """Add action with IntegrityError handling for dedup constraint."""
    try:
        db.add(action)
        db.commit()
        return True
    except IntegrityError:
        db.rollback()
        logger.debug(f"Duplicate action skipped: {action.type} for user {action.user_id}")
        return False
