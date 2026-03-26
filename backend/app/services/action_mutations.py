"""Mutation execution and undo logic for pending actions."""

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..models.budget import Budget, BudgetAllocation
from ..models.pending_action import PendingAction

logger = logging.getLogger(__name__)


def execute_mutation(db: Session, action: PendingAction) -> dict | None:
    """Execute the actual mutation. Returns undo snapshot or None."""
    if action.type == "copy_or_create_budget":
        return _exec_copy_budget(db, action)
    if action.type == "adjust_budget_category":
        return _exec_adjust_allocation(db, action)
    return None  # navigation-only types


def revert_mutation(db: Session, action: PendingAction):
    """Revert a mutation using undo_snapshot."""
    snapshot = action.undo_snapshot
    if action.type == "copy_or_create_budget":
        budget_id = snapshot.get("created_budget_id")
        if budget_id:
            budget = db.query(Budget).filter(Budget.id == budget_id).first()
            if budget:
                db.delete(budget)
                db.flush()
    elif action.type == "adjust_budget_category":
        alloc_id = snapshot.get("allocation_id")
        old_amount = snapshot.get("old_amount")
        if alloc_id and old_amount is not None:
            alloc = db.query(BudgetAllocation).filter(BudgetAllocation.id == alloc_id).first()
            if alloc:
                alloc.amount = old_amount
                db.flush()


def _exec_copy_budget(db: Session, action: PendingAction) -> dict | None:
    month = action.params.get("month")
    prev_month_dt = datetime.strptime(month, "%Y-%m") - timedelta(days=1)
    prev_month = prev_month_dt.strftime("%Y-%m")

    prev_budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == action.user_id,
            Budget.month == prev_month,
            Budget.is_active == True,
        )
        .first()
    )

    if prev_budget:
        new_budget = Budget(
            user_id=action.user_id,
            month=month,
            monthly_income=prev_budget.monthly_income,
            savings_target=prev_budget.savings_target,
            copied_from_id=prev_budget.id,
        )
        db.add(new_budget)
        db.flush()
        for alloc in prev_budget.allocations:
            db.add(
                BudgetAllocation(
                    budget_id=new_budget.id,
                    category=alloc.category,
                    amount=alloc.amount,
                    reasoning="Copied from previous month",
                )
            )
        db.flush()
        return {"created_budget_id": new_budget.id}
    else:
        new_budget = Budget(
            user_id=action.user_id, month=month, monthly_income=0, savings_target=0
        )
        db.add(new_budget)
        db.flush()
        return {"created_budget_id": new_budget.id}


def _exec_adjust_allocation(db: Session, action: PendingAction) -> dict | None:
    alloc_id = action.params.get("allocation_id")
    suggested = action.params.get("suggested_new")
    alloc = db.query(BudgetAllocation).filter(BudgetAllocation.id == alloc_id).first()
    if not alloc:
        return None
    old_amount = alloc.amount
    alloc.amount = suggested
    db.flush()
    return {"allocation_id": alloc_id, "old_amount": old_amount}
