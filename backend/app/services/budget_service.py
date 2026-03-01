"""Budget service for CRUD operations."""
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.budget import Budget, BudgetAllocation, BudgetFeedback
from ..services.budget_prompt_helpers import CATEGORY_ALIASES


def normalize_allocation_category(name: str) -> str:
    """Normalize a budget allocation category name to a real parent category.

    Uses the consolidated CATEGORY_ALIASES dict from budget_prompt_helpers.
    """
    return CATEGORY_ALIASES.get(name.lower(), name)


class BudgetService:
    """Service for budget operations."""

    @staticmethod
    def _normalize_allocations(allocations: list[dict]) -> list[dict]:
        """Normalize and merge allocation category names.

        Applies CATEGORY_ALIASES to each allocation's category.
        If two allocations end up with the same category, their amounts
        are summed and reasonings are concatenated.

        Args:
            allocations: Raw allocation dicts with category, amount, reasoning

        Returns:
            Deduplicated list of allocation dicts
        """
        merged: dict[str, dict] = {}
        for alloc in allocations:
            category = normalize_allocation_category(alloc["category"])
            if category in merged:
                merged[category]["amount"] += alloc["amount"]
                existing_reason = merged[category].get("reasoning") or ""
                new_reason = alloc.get("reasoning") or ""
                if new_reason and existing_reason:
                    merged[category]["reasoning"] = f"{existing_reason}; {new_reason}"
                elif new_reason:
                    merged[category]["reasoning"] = new_reason
            else:
                merged[category] = {
                    "category": category,
                    "amount": alloc["amount"],
                    "reasoning": alloc.get("reasoning"),
                }
        return list(merged.values())

    @staticmethod
    def create_budget(
        db: Session,
        user_id: int,
        month: str,
        monthly_income: int,
        allocations: list[dict],
        savings_target: int | None = None,
        advice: str | None = None,
        copied_from_id: int | None = None
    ) -> Budget:
        """Create new budget version for a month (soft-deactivates existing).

        Args:
            db: Database session
            user_id: User ID
            month: Month string ("2025-11")
            monthly_income: Monthly income amount
            allocations: List of allocation dicts with category, amount, reasoning
            savings_target: Optional savings target
            advice: Optional AI advice
            copied_from_id: Optional ID of budget this was copied from

        Returns:
            Created budget
        """
        # Normalize category names and merge duplicates
        allocations = BudgetService._normalize_allocations(allocations)

        # Get current max version for this month
        max_version = db.query(func.max(Budget.version)).filter(
            Budget.user_id == user_id,
            Budget.month == month
        ).scalar() or 0

        # Soft-deactivate existing active budget for this month
        existing = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == month,
            Budget.is_active == True
        ).first()
        if existing:
            existing.is_active = False
            db.flush()

        # Create new budget with incremented version
        budget = Budget(
            user_id=user_id,
            month=month,
            monthly_income=monthly_income,
            savings_target=savings_target,
            advice=advice,
            version=max_version + 1,
            is_active=True,
            copied_from_id=copied_from_id
        )
        db.add(budget)
        db.flush()

        # Add allocations
        for alloc in allocations:
            allocation = BudgetAllocation(
                budget_id=budget.id,
                category=alloc["category"],
                amount=alloc["amount"],
                reasoning=alloc.get("reasoning")
            )
            db.add(allocation)

        db.commit()
        db.refresh(budget)
        return budget

    @staticmethod
    def copy_budget(
        db: Session,
        user_id: int,
        source_month: str,
        target_month: str,
        monthly_income: int | None = None
    ) -> Budget:
        """Copy budget from one month to another.

        Args:
            db: Database session
            user_id: User ID
            source_month: Source month to copy from
            target_month: Target month to create
            monthly_income: Override income (uses source if None)

        Returns:
            Newly created budget

        Raises:
            ValueError: If source budget not found
        """
        # Get active source budget
        source = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == source_month,
            Budget.is_active == True
        ).first()

        if not source:
            raise ValueError(f"No active budget found for month {source_month}")

        # Copy allocations
        allocations = [
            {
                "category": alloc.category,
                "amount": alloc.amount,
                "reasoning": alloc.reasoning
            }
            for alloc in source.allocations
        ]

        # Create new budget in target month
        return BudgetService.create_budget(
            db=db,
            user_id=user_id,
            month=target_month,
            monthly_income=monthly_income or source.monthly_income,
            allocations=allocations,
            savings_target=source.savings_target,
            advice=f"Copied from {source_month}",
            copied_from_id=source.id
        )

    @staticmethod
    def get_versions(db: Session, user_id: int, month: str) -> list[Budget]:
        """Get all budget versions for a month.

        Args:
            db: Database session
            user_id: User ID
            month: Month string

        Returns:
            List of all budget versions, newest first
        """
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == month
        ).order_by(Budget.version.desc()).all()

    @staticmethod
    def restore_version(db: Session, user_id: int, budget_id: int) -> Budget:
        """Restore a previous budget version as active.

        Args:
            db: Database session
            user_id: User ID
            budget_id: Budget ID to restore

        Returns:
            Restored budget

        Raises:
            ValueError: If budget not found or doesn't belong to user
        """
        # Get the budget to restore
        budget = db.query(Budget).filter(
            Budget.id == budget_id,
            Budget.user_id == user_id
        ).first()

        if not budget:
            raise ValueError("Budget not found")

        # Deactivate current active budget for this month
        current_active = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == budget.month,
            Budget.is_active == True
        ).first()

        if current_active and current_active.id != budget_id:
            current_active.is_active = False

        # Activate the restored budget
        budget.is_active = True
        db.commit()
        db.refresh(budget)
        return budget

    @staticmethod
    def get_latest_budget(db: Session, user_id: int) -> Optional[Budget]:
        """Get the most recent active budget for any month.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Most recent budget or None
        """
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.is_active == True
        ).order_by(Budget.month.desc()).first()

    @staticmethod
    def get_current_budget(db: Session, user_id: int) -> Optional[Budget]:
        """Get current month's active budget.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Budget or None
        """
        current_month = date.today().strftime("%Y-%m")
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == current_month,
            Budget.is_active == True
        ).first()

    @staticmethod
    def get_budget_by_month(db: Session, user_id: int, month: str) -> Optional[Budget]:
        """Get active budget for specific month.

        Args:
            db: Database session
            user_id: User ID
            month: Month string ("2025-11")

        Returns:
            Budget or None
        """
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == month,
            Budget.is_active == True
        ).first()

    @staticmethod
    def add_feedback(db: Session, budget_id: int, feedback: str) -> BudgetFeedback:
        """Add feedback to a budget.

        Args:
            db: Database session
            budget_id: Budget ID
            feedback: User feedback text

        Returns:
            Created feedback
        """
        fb = BudgetFeedback(budget_id=budget_id, feedback=feedback)
        db.add(fb)
        db.commit()
        db.refresh(fb)
        return fb

    @staticmethod
    def get_budget_history(db: Session, user_id: int, limit: int = 12) -> list[Budget]:
        """Get active budget history for user.

        Args:
            db: Database session
            user_id: User ID
            limit: Maximum budgets to return

        Returns:
            List of active budgets ordered by month desc
        """
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.is_active == True
        ).order_by(Budget.month.desc()).limit(limit).all()
