"""Budget-related action generators for the insight-to-action layer."""

import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.budget import Budget
from ..models.pending_action import PendingAction
from ..models.transaction import Transaction
from .action_copy_service import generate_action_copy
from .action_generators_common import safe_add_action

logger = logging.getLogger(__name__)


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

    # Compute 3-month rolling average per category
    three_months_ago = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m")
    category_averages = (
        db.query(
            Transaction.category,
            func.avg(func.abs(Transaction.amount)).label("avg_amount"),
            func.count(Transaction.id).label("count"),
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.amount < 0,
            Transaction.is_transfer == False,
            func.to_char(Transaction.date, "YYYY-MM") >= three_months_ago,
            func.to_char(Transaction.date, "YYYY-MM") < current_month,
        )
        .group_by(Transaction.category)
        .all()
    )

    suggested_allocations = {
        row.category: int(row.avg_amount)
        for row in category_averages
        if row.count >= 2  # at least 2 transactions to be meaningful
    }
    total_suggested = sum(suggested_allocations.values())

    params = {
        "month": current_month,
        "suggested_source": "rolling_average",
        "suggested_total": total_suggested,
        "suggested_allocations": suggested_allocations,
        "category_count": len(suggested_allocations),
    }
    title, description = generate_action_copy("copy_or_create_budget", params)

    action = PendingAction(
        user_id=user_id,
        type="copy_or_create_budget",
        surface="budget_page",
        title=title,
        description=description,
        params=params,
        priority=2,
    )
    return safe_add_action(db, action)


def generate_adjust_budget_category(db: Session, user_id: int) -> bool:
    """Generate action for worst over-budget category."""
    current_month = datetime.utcnow().strftime("%Y-%m")
    three_months_ago = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m")

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

    # Use 3-month average instead of naive spent * 1.1
    avg_3mo = (
        db.query(func.avg(func.abs(Transaction.amount)))
        .filter(
            Transaction.user_id == user_id,
            Transaction.category == alloc.category,
            Transaction.amount < 0,
            func.to_char(Transaction.date, "YYYY-MM") >= three_months_ago,
        )
        .scalar()
    )
    suggested = int(avg_3mo * 1.1) if avg_3mo else int(spent_abs * 1.1)

    params = {
        "category": alloc.category,
        "spent": spent_abs,
        "allocated": alloc.amount,
        "suggested_new": suggested,
        "allocation_id": alloc.id,
        "budget_id": alloc.budget_id,
    }
    title, description = generate_action_copy("adjust_budget_category", params)

    action = PendingAction(
        user_id=user_id,
        type="adjust_budget_category",
        surface="budget_page",
        title=title,
        description=description,
        params=params,
        priority=2,
    )
    return safe_add_action(db, action)
