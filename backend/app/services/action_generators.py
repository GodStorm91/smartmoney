"""Action generators for the insight-to-action layer."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.budget import Budget
from ..models.goal import Goal
from ..models.pending_action import PendingAction
from ..models.transaction import Transaction

logger = logging.getLogger(__name__)


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

    action = PendingAction(
        user_id=user_id,
        type="review_uncategorized",
        surface="dashboard",
        title=f"{count} uncategorized transactions this month",
        description="Review and categorize transactions for better insights.",
        params={"count": count, "month": current_month},
        priority=3,
    )
    db.add(action)
    db.commit()
    return True


def generate_copy_or_create_budget(db: Session, user_id: int) -> bool:
    """Generate action if current month has no active budget."""
    current_month = datetime.utcnow().strftime("%Y-%m")
    has_budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.month == current_month,
            Budget.is_active == True,
        )
        .first()
    )
    if has_budget:
        return False

    action = PendingAction(
        user_id=user_id,
        type="copy_or_create_budget",
        surface="budget_page",
        title=f"No budget for {current_month}",
        description="Create a budget from last month or start fresh.",
        params={"month": current_month, "suggested_source": "previous"},
        priority=2,
    )
    db.add(action)
    db.commit()
    return True


def generate_adjust_budget_category(db: Session, user_id: int) -> bool:
    """Generate action for worst over-budget category."""
    current_month = datetime.utcnow().strftime("%Y-%m")
    budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.month == current_month,
            Budget.is_active == True,
        )
        .first()
    )
    if not budget:
        return False

    worst = None
    worst_overspend = 0
    for alloc in budget.allocations:
        spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category == alloc.category,
                func.to_char(Transaction.date, "YYYY-MM") == current_month,
                Transaction.amount < 0,
            )
            .scalar()
        )
        spent_abs = abs(int(spent or 0))
        overspend = spent_abs - alloc.amount
        if overspend > worst_overspend:
            worst_overspend = overspend
            worst = (alloc, spent_abs)

    if worst is None:
        return False

    alloc, spent_abs = worst
    suggested = int(spent_abs * 1.1)

    action = PendingAction(
        user_id=user_id,
        type="adjust_budget_category",
        surface="budget_page",
        title=f"{alloc.category} over budget by {worst_overspend:,}",
        description=f"Spent {spent_abs:,} vs budgeted {alloc.amount:,}.",
        params={
            "category": alloc.category,
            "current_spent": spent_abs,
            "allocated": alloc.amount,
            "suggested_new": suggested,
            "allocation_id": alloc.id,
            "budget_id": alloc.budget_id,
        },
        priority=2,
    )
    db.add(action)
    db.commit()
    return True


def generate_review_goal_catch_up(db: Session, user_id: int) -> bool:
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
    action = PendingAction(
        user_id=user_id,
        type="review_goal_catch_up",
        surface="dashboard",
        title=f"Goal '{goal.years}Y' is behind schedule",
        description=f"Need ~{monthly_needed:,}/mo to catch up.",
        params={
            "goal_id": goal.id,
            "goal_name": f"{goal.years}-year goal",
            "current_amount": int(goal.target_amount * (goal.last_milestone_pct or 0) / 100),
            "target": goal.target_amount,
            "monthly_needed": monthly_needed,
        },
        priority=3,
    )
    db.add(action)
    db.commit()
    return True
