"""Action generators for the insight-to-action layer.

Budget generators are in action_generators_budget.py.
"""

import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.goal import Goal
from ..models.pending_action import PendingAction
from ..models.report_ai_summary import ReportAISummary
from ..models.transaction import Transaction
from .action_copy_service import generate_action_copy
from .action_generators_common import safe_add_action

# Re-export budget generators so existing imports keep working
from .action_generators_budget import (  # noqa: F401
    generate_copy_or_create_budget,
    generate_adjust_budget_category,
)

logger = logging.getLogger(__name__)

# Keep backward-compatible alias
_safe_add_action = safe_add_action


def generate_review_uncategorized(db: Session, user_id: int) -> bool:
    """Generate action if >5 uncategorized transactions this month."""
    current_month = datetime.utcnow().strftime("%Y-%m")
    count = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.user_id == user_id,
            Transaction.category == "Other",
            func.to_char(Transaction.date, "YYYY-MM") == current_month,
        )
        .scalar()
    ) or 0

    if count <= 5:
        return False

    params = {"count": count, "month": current_month}
    title, description = generate_action_copy("review_uncategorized", params)

    action = PendingAction(
        user_id=user_id,
        type="review_uncategorized",
        surface="dashboard",
        title=title,
        description=description,
        params=params,
        priority=3,
    )
    return safe_add_action(db, action)


def generate_review_goal_catch_up(
    db: Session, user_id: int, surface: str = "dashboard"
) -> bool:
    """Generate action for most-behind goal."""
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    if not goals:
        return False

    most_behind = None
    worst_gap = 0.0
    now = datetime.utcnow().date()

    for goal in goals:
        if not goal.start_date or goal.target_amount <= 0:
            continue
        total_months = goal.years * 12
        elapsed = (now.year - goal.start_date.year) * 12 + (now.month - goal.start_date.month)
        if elapsed <= 0 or elapsed >= total_months:
            continue
        expected_pct = elapsed / total_months
        current_pct = (goal.last_milestone_pct or 0) / 100.0
        gap = expected_pct - current_pct
        if gap > worst_gap:
            worst_gap = gap
            monthly_needed = int(
                (goal.target_amount * (1 - current_pct)) / max(total_months - elapsed, 1)
            )
            most_behind = (goal, monthly_needed)

    if most_behind is None or worst_gap < 0.05:
        return False

    goal, monthly_needed = most_behind
    params = {
        "goal_id": goal.id,
        "goalName": f"{goal.years}-year goal",
        "current_amount": int(goal.target_amount * (goal.last_milestone_pct or 0) / 100),
        "target": goal.target_amount,
        "monthlyNeeded": monthly_needed,
    }
    title, description = generate_action_copy("review_goal_catch_up", params)

    action = PendingAction(
        user_id=user_id,
        type="review_goal_catch_up",
        surface=surface,
        title=title,
        description=description,
        params=params,
        priority=3,
    )
    return safe_add_action(db, action)


def generate_monthly_report_nudge(db: Session, user_id: int) -> bool:
    """Generate a dashboard nudge to review the previous month's report."""
    now = datetime.utcnow()
    if now.day > 3:
        return False

    report_date = now.replace(day=1) - timedelta(days=1)
    month_name = report_date.strftime("%B %Y")
    params = {
        "month": report_date.strftime("%Y-%m"),
        "monthName": month_name,
        "reportYear": report_date.year,
        "reportMonth": report_date.month,
    }

    summary = (
        db.query(ReportAISummary)
        .filter(
            ReportAISummary.user_id == user_id,
            ReportAISummary.year == report_date.year,
            ReportAISummary.month == report_date.month,
        )
        .order_by(ReportAISummary.created_at.desc())
        .first()
    )
    if summary:
        params["summary"] = summary.win

    title, description = generate_action_copy("monthly_report_nudge", params)

    action = PendingAction(
        user_id=user_id,
        type="monthly_report_nudge",
        surface="dashboard",
        title=title,
        description=description,
        params=params,
        priority=4,
    )
    return safe_add_action(db, action)
