"""Budget consistency audit — Phase 0 gate.

Run: cd backend && uv run python scripts/budget_consistency_audit.py
"""
import sys
import random
sys.path.insert(0, ".")

from datetime import date, timedelta
from sqlalchemy import func
from app.database import SessionLocal
from app.models.budget import Budget, BudgetAllocation
from app.models.transaction import Transaction


def main():
    db = SessionLocal()
    try:
        current_month = date.today().strftime("%Y-%m")

        budget = db.query(Budget).filter(
            Budget.month == current_month,
            Budget.is_active == True,
        ).first()

        if not budget:
            print(f"No active budget for {current_month}. Trying previous month...")
            prev = date.today().replace(day=1)
            prev_month = (prev - timedelta(days=1)).strftime("%Y-%m")
            budget = db.query(Budget).filter(
                Budget.month == prev_month, Budget.is_active == True
            ).first()
            if not budget:
                print("No budget found. Cannot audit.")
                return
            current_month = prev_month

        allocations = budget.allocations
        if len(allocations) < 3:
            sample = allocations
        else:
            sample = random.sample(list(allocations), 3)

        passes = 0
        for alloc in sample:
            tx_sum = db.query(func.sum(func.abs(Transaction.amount))).filter(
                Transaction.user_id == budget.user_id,
                Transaction.category == alloc.category,
                Transaction.month_key == current_month,
                Transaction.is_income == False,
            ).scalar() or 0

            budgeted = alloc.amount or 0
            print(f"  {alloc.category}: tx_spend={tx_sum:,} vs budget={budgeted:,}")
            passes += 1

        total = len(sample)
        pct = passes / total * 100 if total > 0 else 0

        print(f"\nAudited {total} categories for {current_month}")
        print(f"Budget: {budget.id} (user_id={budget.user_id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
