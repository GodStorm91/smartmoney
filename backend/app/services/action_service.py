"""Action service for insight-to-action layer."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.pending_action import PendingAction
from ..models.settings import AppSettings
from ..models.transaction import Transaction
from .action_generators import (
    generate_review_uncategorized,
    generate_copy_or_create_budget,
    generate_adjust_budget_category,
    generate_monthly_report_nudge,
    generate_review_goal_catch_up,
)
from .action_guard_checks import has_active_action, is_in_cooldown, is_auto_paused
from .action_lifecycle_ops import ActionLifecycleOps

logger = logging.getLogger(__name__)

_action_service = None


def get_action_service() -> "ActionService":
    """Singleton accessor."""
    global _action_service
    if _action_service is None:
        _action_service = ActionService()
    return _action_service


class ActionService(ActionLifecycleOps):
    """Generate and manage pending actions from insights."""

    def generate_actions(self, db: Session, user_id: int) -> int:
        """Run all generators, return count of new actions created."""
        if is_auto_paused(db, user_id):
            return 0

        # Read expansion settings
        settings = db.query(AppSettings).filter(AppSettings.user_id == user_id).first()
        expanded = settings.smart_actions_expanded if settings else False
        auto_execute = settings.smart_actions_auto_execute if settings else False

        goal_surface = "goals_page" if expanded else "dashboard"
        generators = [
            ("review_uncategorized", generate_review_uncategorized),
            ("copy_or_create_budget", generate_copy_or_create_budget),
            ("adjust_budget_category", generate_adjust_budget_category),
            ("review_goal_catch_up", lambda d, u: generate_review_goal_catch_up(d, u, surface=goal_surface)),
            ("monthly_report_nudge", generate_monthly_report_nudge),
        ]
        created = 0
        for action_type, gen in generators:
            try:
                if has_active_action(db, user_id, action_type):
                    continue
                if is_in_cooldown(db, user_id, action_type):
                    continue
                if gen(db, user_id):
                    created += 1
            except Exception as e:
                db.rollback()
                logger.error(f"Action generator failed for user {user_id}: {e}")

        # Boost budget/savings action priority after payday
        if created > 0 and self._detect_recent_payday(db, user_id):
            budget_actions = db.query(PendingAction).filter(
                PendingAction.user_id == user_id,
                PendingAction.status == "pending",
                PendingAction.type.in_(["copy_or_create_budget", "adjust_budget_category"]),
            ).all()
            for a in budget_actions:
                a.priority = max(a.priority - 1, 1)  # Lower number = higher priority
                logger.info(f"Payday boost: action {a.id} priority -> {a.priority}")
            if budget_actions:
                db.commit()

        # Auto-execute mutation actions if enabled (never navigation actions)
        if auto_execute and created > 0:
            auto_types = ["copy_or_create_budget", "adjust_budget_category"]
            new_auto = db.query(PendingAction).filter(
                PendingAction.user_id == user_id,
                PendingAction.status == "pending",
                PendingAction.type.in_(auto_types),
            ).all()
            for action in new_auto:
                self.execute_action(db, user_id, action.id)
                logger.info(f"Auto-executed action {action.id} ({action.type})")

        return created

    def _detect_recent_payday(self, db: Session, user_id: int) -> bool:
        """Check if user received income in the last 3 days."""
        three_days_ago = datetime.utcnow().date() - timedelta(days=3)
        income_count = (
            db.query(func.count(Transaction.id))
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_income == True,
                Transaction.date >= three_days_ago,
            )
            .scalar()
        ) or 0
        return income_count > 0
