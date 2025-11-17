"""Goal service for financial goal tracking and progress calculations."""
from datetime import date
from typing import Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..models.goal import Goal
from ..models.transaction import Transaction


class GoalService:
    """Service for goal operations."""

    @staticmethod
    def create_goal(db: Session, goal_data: dict) -> Goal:
        """Create a new financial goal.

        Args:
            db: Database session
            goal_data: Goal data dictionary

        Returns:
            Created goal
        """
        goal = Goal(**goal_data)
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def get_goal(db: Session, goal_id: int) -> Optional[Goal]:
        """Get goal by ID.

        Args:
            db: Database session
            goal_id: Goal ID

        Returns:
            Goal or None
        """
        return db.query(Goal).filter(Goal.id == goal_id).first()

    @staticmethod
    def get_goal_by_years(db: Session, years: int) -> Optional[Goal]:
        """Get goal by year horizon.

        Args:
            db: Database session
            years: Year horizon (1, 3, 5, or 10)

        Returns:
            Goal or None
        """
        return db.query(Goal).filter(Goal.years == years).first()

    @staticmethod
    def get_all_goals(db: Session) -> list[Goal]:
        """Get all goals ordered by years.

        Args:
            db: Database session

        Returns:
            List of goals
        """
        return db.query(Goal).order_by(Goal.years).all()

    @staticmethod
    def update_goal(db: Session, goal_id: int, goal_data: dict) -> Optional[Goal]:
        """Update a goal.

        Args:
            db: Database session
            goal_id: Goal ID
            goal_data: Updated goal data

        Returns:
            Updated goal or None
        """
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return None

        for key, value in goal_data.items():
            setattr(goal, key, value)

        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def delete_goal(db: Session, goal_id: int) -> bool:
        """Delete a goal.

        Args:
            db: Database session
            goal_id: Goal ID

        Returns:
            True if deleted, False if not found
        """
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            return False

        db.delete(goal)
        db.commit()
        return True

    @staticmethod
    def calculate_goal_progress(db: Session, goal: Goal) -> dict:
        """Calculate progress towards a financial goal.

        Args:
            db: Database session
            goal: Goal object

        Returns:
            Dictionary with progress metrics
        """
        # Determine start date
        if goal.start_date:
            start_date = goal.start_date
        else:
            # Use earliest transaction date
            first_tx = (
                db.query(func.min(Transaction.date))
                .filter(~Transaction.is_transfer)
                .scalar()
            )
            start_date = first_tx or date.today()

        # Calculate total net savings so far
        net_so_far = GoalService._calculate_net_savings(db, start_date)

        # Calculate time metrics
        now = date.today()
        target_date = start_date + relativedelta(years=goal.years)

        months_total = goal.years * 12
        months_elapsed = (
            (now.year - start_date.year) * 12 + (now.month - start_date.month)
        )
        months_remaining = max(months_total - months_elapsed, 1)

        # Calculate required savings
        needed_remaining = max(goal.target_amount - net_so_far, 0)
        needed_per_month = needed_remaining / months_remaining

        # Calculate average monthly net
        avg_monthly_net = net_so_far / max(months_elapsed, 1) if months_elapsed > 0 else 0

        # Calculate progress percentage
        progress_pct = (net_so_far / goal.target_amount * 100) if goal.target_amount > 0 else 0

        # Determine status
        projected_total = net_so_far + (months_remaining * avg_monthly_net)
        if projected_total > goal.target_amount * 1.05:
            status = "ahead"
        elif projected_total >= goal.target_amount * 0.95:
            status = "on_track"
        else:
            status = "behind"

        return {
            "goal_id": goal.id,
            "years": goal.years,
            "target_amount": goal.target_amount,
            "start_date": start_date.isoformat(),
            "target_date": target_date.isoformat(),
            "current_date": now.isoformat(),
            "total_saved": net_so_far,
            "progress_percentage": round(progress_pct, 2),
            "months_total": months_total,
            "months_elapsed": months_elapsed,
            "months_remaining": months_remaining,
            "avg_monthly_net": round(avg_monthly_net, 0),
            "needed_per_month": round(needed_per_month, 0),
            "needed_remaining": needed_remaining,
            "projected_total": round(projected_total, 0),
            "status": status,
        }

    @staticmethod
    def _calculate_net_savings(db: Session, start_date: date) -> int:
        """Calculate total net savings from start date.

        Args:
            db: Database session
            start_date: Starting date for calculation

        Returns:
            Total net savings (income - expenses)
        """
        result = db.query(
            func.sum(
                case(
                    (Transaction.is_income, Transaction.amount), else_=0
                )
            ).label("income"),
            func.sum(
                case(
                    (~Transaction.is_income, Transaction.amount), else_=0
                )
            ).label("expenses"),
        ).filter(
            ~Transaction.is_transfer,
            Transaction.date >= start_date
        ).first()

        income = result.income or 0
        expenses = result.expenses or 0

        return income - abs(expenses)
