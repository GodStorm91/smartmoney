"""Action service for insight-to-action layer."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.pending_action import PendingAction
from .action_generators import (
    generate_review_uncategorized,
    generate_copy_or_create_budget,
    generate_adjust_budget_category,
    generate_review_goal_catch_up,
)
from .action_mutations import execute_mutation, revert_mutation

logger = logging.getLogger(__name__)

_action_service = None


def get_action_service() -> "ActionService":
    """Singleton accessor."""
    global _action_service
    if _action_service is None:
        _action_service = ActionService()
    return _action_service


class ActionService:
    """Generate and manage pending actions from insights."""

    def generate_actions(self, db: Session, user_id: int) -> int:
        """Run all generators, return count of new actions created."""
        if self._is_auto_paused(db, user_id):
            return 0

        generators = [
            generate_review_uncategorized,
            generate_copy_or_create_budget,
            generate_adjust_budget_category,
            generate_review_goal_catch_up,
        ]
        created = 0
        for gen in generators:
            try:
                action_type = gen.__name__.replace("generate_", "")
                if self._has_active_action(db, user_id, action_type):
                    continue
                if self._is_in_cooldown(db, user_id, action_type):
                    continue
                if gen(db, user_id):
                    created += 1
            except Exception as e:
                db.rollback()
                logger.error(f"Action generator failed for user {user_id}: {e}")
        return created

    # ── Surface / Execute / Dismiss / Undo ─────────────────

    def surface_actions(
        self, db: Session, user_id: int, surface: str | None = None, limit: int = 5
    ):
        """Return highest-priority pending actions. Mark first as surfaced."""
        query = db.query(PendingAction).filter(
            PendingAction.user_id == user_id,
            PendingAction.status.in_(["pending", "surfaced"]),
        )
        if surface:
            query = query.filter(PendingAction.surface == surface)

        actions = (
            query.order_by(PendingAction.priority.asc(), PendingAction.created_at.desc())
            .limit(limit)
            .all()
        )

        if actions and actions[0].status == "pending":
            actions[0].surfaced_at = datetime.utcnow()
            actions[0].status = "surfaced"
            db.commit()

        return actions

    def execute_action(self, db: Session, user_id: int, action_id: int):
        """Execute an action. Returns (success, message, undo_available)."""
        action = (
            db.query(PendingAction)
            .filter(PendingAction.id == action_id, PendingAction.user_id == user_id)
            .first()
        )
        if not action:
            return False, "Action not found", False
        if action.status == "executed":
            return True, "Already executed", action.undo_snapshot is not None

        try:
            undo = execute_mutation(db, action)
            action.undo_snapshot = undo
            action.status = "executed"
            action.executed_at = datetime.utcnow()
            db.commit()
            return True, "Action executed", undo is not None
        except Exception as e:
            db.rollback()
            logger.error(f"Execute action {action_id} failed: {e}")
            return False, str(e), False

    def dismiss_action(self, db: Session, user_id: int, action_id: int):
        """Dismiss an action. Returns (success, message)."""
        action = (
            db.query(PendingAction)
            .filter(PendingAction.id == action_id, PendingAction.user_id == user_id)
            .first()
        )
        if not action:
            return False, "Action not found"
        action.status = "dismissed"
        action.dismissed_at = datetime.utcnow()
        db.commit()
        return True, "Action dismissed"

    def undo_action(self, db: Session, user_id: int, action_id: int):
        """Undo an executed action within 24h window."""
        action = (
            db.query(PendingAction)
            .filter(PendingAction.id == action_id, PendingAction.user_id == user_id)
            .first()
        )
        if not action:
            return False, "Action not found", False
        if action.status != "executed":
            return False, "Action not in executed state", False
        if not action.undo_snapshot:
            return False, "No undo data available", False
        if action.executed_at and (datetime.utcnow() - action.executed_at) > timedelta(hours=24):
            return False, "Undo window expired (24h)", False

        try:
            revert_mutation(db, action)
            action.status = "undone"
            action.undone_at = datetime.utcnow()
            db.commit()
            return True, "Action undone", False
        except Exception as e:
            db.rollback()
            logger.error(f"Undo action {action_id} failed: {e}")
            return False, str(e), False

    def expire_stale_actions(self, db: Session) -> int:
        """Bulk-expire stale actions. Returns count."""
        now = datetime.utcnow()
        count = (
            db.query(PendingAction)
            .filter(
                PendingAction.expires_at < now,
                PendingAction.status.in_(["pending", "surfaced"]),
            )
            .update({"status": "expired"}, synchronize_session="fetch")
        )
        db.commit()
        return count

    def get_pending_count(self, db: Session, user_id: int) -> int:
        """Count pending/surfaced actions for badge."""
        return (
            db.query(func.count(PendingAction.id))
            .filter(
                PendingAction.user_id == user_id,
                PendingAction.status.in_(["pending", "surfaced"]),
            )
            .scalar()
        ) or 0

    # ── Dedup / cooldown / pause checks ─────────────────────

    def _has_active_action(self, db: Session, user_id: int, action_type: str) -> bool:
        return (
            db.query(PendingAction)
            .filter(
                PendingAction.user_id == user_id,
                PendingAction.type == action_type,
                PendingAction.status.in_(["pending", "surfaced"]),
            )
            .first()
        ) is not None

    def _is_in_cooldown(self, db: Session, user_id: int, action_type: str) -> bool:
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

    def _is_auto_paused(self, db: Session, user_id: int) -> bool:
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
