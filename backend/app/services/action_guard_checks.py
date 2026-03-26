"""Guard checks for action generation: dedup, cooldown, auto-pause."""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.pending_action import PendingAction


def has_active_action(db: Session, user_id: int, action_type: str) -> bool:
    """Check if user already has an active action of this type."""
    return (
        db.query(PendingAction)
        .filter(
            PendingAction.user_id == user_id,
            PendingAction.type == action_type,
            PendingAction.status.in_(["pending", "surfaced"]),
        )
        .first()
    ) is not None


def is_in_cooldown(db: Session, user_id: int, action_type: str) -> bool:
    """Check if action type was recently dismissed (30-day cooldown)."""
    cutoff = datetime.utcnow() - timedelta(days=30)
    return (
        db.query(PendingAction)
        .filter(
            PendingAction.user_id == user_id,
            PendingAction.type == action_type,
            PendingAction.status == "dismissed",
            PendingAction.dismissed_at >= cutoff,
        )
        .first()
    ) is not None


def is_auto_paused(db: Session, user_id: int) -> bool:
    """Check if user dismissed 3+ actions in last 30 days (auto-pause)."""
    cutoff = datetime.utcnow() - timedelta(days=30)
    dismissed_count = (
        db.query(func.count(PendingAction.id))
        .filter(
            PendingAction.user_id == user_id,
            PendingAction.status == "dismissed",
            PendingAction.dismissed_at >= cutoff,
        )
        .scalar()
    ) or 0
    return dismissed_count >= 3
