"""Budget service for CRUD operations."""
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.budget import Budget, BudgetAllocation, BudgetFeedback
from ..models.transaction import Transaction
from ..models.settings import AppSettings


class BudgetService:
    """Service for budget operations."""

    @staticmethod
    def get_previous_month(month: str) -> str:
        """Get previous month string from YYYY-MM format."""
        year, m = map(int, month.split('-'))
        if m == 1:
            return f"{year - 1}-12"
        return f"{year}-{m - 1:02d}"

    @staticmethod
    def calculate_carry_over(db: Session, user_id: int, month: str) -> int:
        """Calculate carry-over from previous month.

        Returns positive if under budget (surplus), negative if over budget (deficit).
        Returns 0 if carry-over is disabled in settings or no previous budget exists.
        """
        # Check if carry-over is enabled
        settings = db.query(AppSettings).filter(AppSettings.user_id == user_id).first()
        if not settings or not settings.budget_carry_over:
            return 0

        # Get previous month budget
        prev_month = BudgetService.get_previous_month(month)
        prev_budget = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == prev_month
        ).first()

        if not prev_budget:
            return 0

        # Calculate total budgeted amount for previous month
        total_budgeted = sum(alloc.amount for alloc in prev_budget.allocations)

        # Get previous month date range
        year, m = map(int, prev_month.split('-'))
        month_start = date(year, m, 1)
        if m == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, m + 1, 1) - timedelta(days=1)

        # Calculate actual spending for previous month
        total_spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_income == False,
                Transaction.is_transfer == False,
                Transaction.is_adjustment == False,
                Transaction.date >= month_start,
                Transaction.date <= month_end
            )
            .scalar()
        )
        total_spent = abs(total_spent or 0)

        # Carry-over = budgeted - spent
        # Positive = under budget (surplus), negative = over budget (deficit)
        carry_over = total_budgeted - total_spent

        # Include any carry-over from the previous budget as well (chain carry-over)
        carry_over += prev_budget.carry_over or 0

        return carry_over

    @staticmethod
    def create_budget(
        db: Session,
        user_id: int,
        month: str,
        monthly_income: int,
        allocations: list[dict],
        savings_target: int | None = None,
        advice: str | None = None,
        language: str = "ja"
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
            language: Language used for AI advice

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

        # Calculate carry-over from previous month
        carry_over = BudgetService.calculate_carry_over(db, user_id, month)

        # Create new budget
        budget = Budget(
            user_id=user_id,
            month=month,
            monthly_income=monthly_income,
            savings_target=savings_target,
            advice=advice,
            language=language,
            carry_over=carry_over
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

    @staticmethod
    def _recalculate_savings_target(db: Session, budget: Budget) -> None:
        """Recalculate savings_target based on income - allocations.

        Args:
            db: Database session
            budget: Budget to update
        """
        total_allocated = sum(alloc.amount for alloc in budget.allocations)
        budget.savings_target = budget.monthly_income - total_allocated

    @staticmethod
    def update_allocation(
        db: Session,
        budget_id: int,
        category: str,
        amount: int
    ) -> Optional[Budget]:
        """Update a single allocation amount.

        Args:
            db: Database session
            budget_id: Budget ID
            category: Category name to update
            amount: New amount

        Returns:
            Updated budget or None if not found
        """
        allocation = db.query(BudgetAllocation).filter(
            BudgetAllocation.budget_id == budget_id,
            BudgetAllocation.category == category
        ).first()

        if not allocation:
            return None

        allocation.amount = amount

        budget = db.query(Budget).filter(Budget.id == budget_id).first()
        BudgetService._recalculate_savings_target(db, budget)
        db.commit()
        db.refresh(budget)
        return budget

    @staticmethod
    def delete_allocation(
        db: Session,
        budget_id: int,
        category: str
    ) -> Optional[Budget]:
        """Delete a single allocation.

        Args:
            db: Database session
            budget_id: Budget ID
            category: Category name to delete

        Returns:
            Updated budget or None if not found
        """
        allocation = db.query(BudgetAllocation).filter(
            BudgetAllocation.budget_id == budget_id,
            BudgetAllocation.category == category
        ).first()

        if not allocation:
            return None

        db.delete(allocation)

        budget = db.query(Budget).filter(Budget.id == budget_id).first()
        db.flush()  # Ensure allocation is deleted before recalculating
        db.refresh(budget)  # Refresh to get updated allocations list
        BudgetService._recalculate_savings_target(db, budget)
        db.commit()
        db.refresh(budget)
        return budget
