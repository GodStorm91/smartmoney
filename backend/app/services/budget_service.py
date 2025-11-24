"""Budget service for CRUD operations."""
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from ..models.budget import Budget, BudgetAllocation, BudgetFeedback


class BudgetService:
    """Service for budget operations."""

    @staticmethod
    def create_budget(
        db: Session,
        user_id: int,
        month: str,
        monthly_income: int,
        allocations: list[dict],
        savings_target: int | None = None,
        advice: str | None = None
    ) -> Budget:
        """Create or replace budget for a month.

        Args:
            db: Database session
            user_id: User ID
            month: Month string ("2025-11")
            monthly_income: Monthly income amount
            allocations: List of allocation dicts with category, amount, reasoning
            savings_target: Optional savings target
            advice: Optional AI advice

        Returns:
            Created budget
        """
        # Delete existing budget for this month
        existing = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == month
        ).first()
        if existing:
            db.delete(existing)
            db.flush()

        # Create new budget
        budget = Budget(
            user_id=user_id,
            month=month,
            monthly_income=monthly_income,
            savings_target=savings_target,
            advice=advice
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
    def get_current_budget(db: Session, user_id: int) -> Optional[Budget]:
        """Get current month's budget.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Budget or None
        """
        current_month = date.today().strftime("%Y-%m")
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == current_month
        ).first()

    @staticmethod
    def get_budget_by_month(db: Session, user_id: int, month: str) -> Optional[Budget]:
        """Get budget for specific month.

        Args:
            db: Database session
            user_id: User ID
            month: Month string ("2025-11")

        Returns:
            Budget or None
        """
        return db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == month
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
        """Get budget history for user.

        Args:
            db: Database session
            user_id: User ID
            limit: Maximum budgets to return

        Returns:
            List of budgets ordered by month desc
        """
        return db.query(Budget).filter(
            Budget.user_id == user_id
        ).order_by(Budget.month.desc()).limit(limit).all()
