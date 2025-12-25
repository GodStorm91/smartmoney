"""Goal service for financial goal tracking and progress calculations."""
from datetime import date, datetime
from typing import Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from ..models.goal import Goal
from ..models.transaction import Transaction
from ..models.account import Account


class GoalService:
    """Service for goal operations."""

    @staticmethod
    def create_goal(db: Session, goal_data: dict) -> Goal:
        """Create a new financial goal.

        Args:
            db: Database session
            goal_data: Goal data dictionary (must include user_id)

        Returns:
            Created goal
        """
        goal = Goal(**goal_data)
        db.add(goal)
        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def get_goal(db: Session, user_id: int, goal_id: int) -> Optional[Goal]:
        """Get goal by ID for a specific user.

        Args:
            db: Database session
            user_id: User ID
            goal_id: Goal ID

        Returns:
            Goal or None
        """
        return db.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == user_id
        ).first()

    @staticmethod
    def get_goal_by_years(db: Session, user_id: int, years: int) -> Optional[Goal]:
        """Get goal by year horizon for a specific user.

        Args:
            db: Database session
            user_id: User ID
            years: Year horizon (1, 3, 5, or 10)

        Returns:
            Goal or None
        """
        return db.query(Goal).filter(
            Goal.years == years,
            Goal.user_id == user_id
        ).first()

    @staticmethod
    def get_all_goals(db: Session, user_id: int) -> list[Goal]:
        """Get all goals ordered by priority for a specific user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of goals
        """
        return db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.priority).all()

    @staticmethod
    def has_emergency_fund(db: Session, user_id: int) -> bool:
        """Check if user has emergency fund goal.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            True if emergency fund goal exists
        """
        return db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.goal_type == "emergency_fund"
        ).first() is not None

    @staticmethod
    def get_next_priority(db: Session, user_id: int) -> int:
        """Get next priority number for new goal.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Next priority number
        """
        max_priority = db.query(func.max(Goal.priority)).filter(
            Goal.user_id == user_id
        ).scalar()
        return (max_priority or 0) + 1

    @staticmethod
    def reorder_goals(db: Session, user_id: int, goal_ids: list[int]) -> list[Goal]:
        """Reorder goals by priority. Emergency fund must remain #1.

        Args:
            db: Database session
            user_id: User ID
            goal_ids: Ordered list of goal IDs

        Returns:
            Reordered list of goals

        Raises:
            ValueError: If goal IDs are invalid or emergency fund is not first
        """
        goals = db.query(Goal).filter(
            Goal.user_id == user_id,
            Goal.id.in_(goal_ids)
        ).all()

        if len(goals) != len(goal_ids):
            raise ValueError("Invalid goal IDs")

        # Check emergency fund constraint
        emergency_goal = next((g for g in goals if g.goal_type == "emergency_fund"), None)
        if emergency_goal and goal_ids[0] != emergency_goal.id:
            raise ValueError("Emergency fund must be priority 1")

        # Update priorities
        for priority, goal_id in enumerate(goal_ids, start=1):
            goal = next(g for g in goals if g.id == goal_id)
            goal.priority = priority

        db.commit()
        return GoalService.get_all_goals(db, user_id)

    @staticmethod
    def update_milestones(db: Session, goal: Goal, progress_pct: float) -> Goal:
        """Update milestone timestamps if reached.

        Args:
            db: Database session
            goal: Goal object
            progress_pct: Current progress percentage

        Returns:
            Updated goal
        """
        now = datetime.now()

        if progress_pct >= 25 and not goal.milestone_25_at:
            goal.milestone_25_at = now
        if progress_pct >= 50 and not goal.milestone_50_at:
            goal.milestone_50_at = now
        if progress_pct >= 75 and not goal.milestone_75_at:
            goal.milestone_75_at = now
        if progress_pct >= 100 and not goal.milestone_100_at:
            goal.milestone_100_at = now

        db.commit()
        return goal

    @staticmethod
    def update_goal(db: Session, user_id: int, goal_id: int, goal_data: dict) -> Optional[Goal]:
        """Update a goal.

        Args:
            db: Database session
            user_id: User ID
            goal_id: Goal ID
            goal_data: Updated goal data

        Returns:
            Updated goal or None
        """
        goal = db.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == user_id
        ).first()
        if not goal:
            return None

        for key, value in goal_data.items():
            setattr(goal, key, value)

        db.commit()
        db.refresh(goal)
        return goal

    @staticmethod
    def delete_goal(db: Session, user_id: int, goal_id: int) -> bool:
        """Delete a goal.

        Args:
            db: Database session
            user_id: User ID
            goal_id: Goal ID

        Returns:
            True if deleted, False if not found
        """
        goal = db.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == user_id
        ).first()
        if not goal:
            return False

        db.delete(goal)
        db.commit()
        return True

    @staticmethod
    def calculate_goal_progress(db: Session, user_id: int, goal: Goal) -> dict:
        """Calculate progress towards a financial goal.

        Args:
            db: Database session
            user_id: User ID
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
                .filter(
                    Transaction.user_id == user_id,
                    ~Transaction.is_transfer
                )
                .scalar()
            )
            start_date = first_tx or date.today()

        # Calculate total net savings so far
        net_so_far = GoalService._calculate_net_savings(db, user_id, start_date)

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

        # Get linked account info if available
        account_name = None
        if goal.account_id and goal.account:
            account_name = goal.account.name

        return {
            "goal_id": goal.id,
            "goal_type": goal.goal_type,
            "name": goal.name,
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
            "priority": goal.priority,
            "account_id": goal.account_id,
            "account_name": account_name,
            "milestone_25_at": goal.milestone_25_at,
            "milestone_50_at": goal.milestone_50_at,
            "milestone_75_at": goal.milestone_75_at,
            "milestone_100_at": goal.milestone_100_at,
        }

    @staticmethod
    def _calculate_net_savings(db: Session, user_id: int, start_date: date) -> int:
        """Calculate total net savings from start date for a specific user.

        Args:
            db: Database session
            user_id: User ID
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
            Transaction.user_id == user_id,
            ~Transaction.is_transfer,
            Transaction.date >= start_date
        ).first()

        income = result.income or 0
        expenses = result.expenses or 0

        return income - abs(expenses)

    @staticmethod
    def calculate_achievability(db: Session, user_id: int, goal: Goal, trend_months: int = 3) -> dict:
        """Calculate goal achievability based on rolling average cashflow.

        Args:
            db: Database session
            user_id: User ID
            goal: Goal object
            trend_months: Number of months to average (1-24, default=3)

        Returns:
            Dictionary with achievability metrics
        """
        # Validate trend_months parameter
        trend_months = max(1, min(24, trend_months))
        # Determine start date
        if goal.start_date:
            start_date = goal.start_date
        else:
            # Use earliest transaction date
            first_tx = (
                db.query(func.min(Transaction.date))
                .filter(
                    Transaction.user_id == user_id,
                    ~Transaction.is_transfer
                )
                .scalar()
            )
            start_date = first_tx or date.today()

        # Calculate months remaining
        now = date.today()
        target_date = start_date + relativedelta(years=goal.years)
        months_total = goal.years * 12
        months_elapsed = (
            (now.year - start_date.year) * 12 + (now.month - start_date.month)
        )
        months_remaining = max(months_total - months_elapsed, 1)

        # Calculate trend period start (last N complete months)
        # Use previous month to ensure we have complete data
        last_complete_month = (now.replace(day=1) - relativedelta(days=1))
        trend_start = (last_complete_month.replace(day=1) - relativedelta(months=trend_months - 1))

        # Query monthly cashflows for trend period (grouped by month_key)
        monthly_data = db.query(
            Transaction.month_key,
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
            Transaction.user_id == user_id,
            ~Transaction.is_transfer,
            Transaction.date >= trend_start,
            Transaction.date <= last_complete_month
        ).group_by(Transaction.month_key).all()

        # Calculate average monthly net from period data
        if monthly_data:
            monthly_nets = [float(income) - abs(float(expenses)) for _, income, expenses in monthly_data]
            current_monthly_net = sum(monthly_nets) / len(monthly_nets)
            actual_months_used = len(monthly_nets)

            # Format period display
            month_keys = sorted([row.month_key for row in monthly_data])
            if len(month_keys) > 1:
                period_display = f"{month_keys[0]} to {month_keys[-1]} ({actual_months_used} months avg)"
            else:
                period_display = f"{month_keys[0]} (1 month)"
        else:
            # Fallback: no data in period
            current_monthly_net = 0
            actual_months_used = 0
            period_display = "No data available"

        # Calculate achievable amount (linear projection)
        achievable_amount = current_monthly_net * months_remaining

        # Calculate achievable percentage
        achievable_percentage = (
            (achievable_amount / goal.target_amount * 100)
            if goal.target_amount > 0
            else 0
        )

        # Calculate required monthly savings
        total_saved = GoalService._calculate_net_savings(db, user_id, start_date)
        needed_remaining = goal.target_amount - total_saved
        required_monthly = needed_remaining / months_remaining

        # Calculate monthly gap
        monthly_gap = required_monthly - current_monthly_net

        # Determine status tier based on achievable percentage
        if achievable_percentage >= 100:
            status_tier = "on_track"
        elif achievable_percentage >= 80:
            status_tier = "achievable"
        elif achievable_percentage >= 50:
            status_tier = "challenging"
        elif achievable_percentage >= 0:
            status_tier = "deficit"
        else:
            status_tier = "severe_deficit"

        # Generate recommendation
        recommendation = GoalService._generate_recommendation(
            status_tier=status_tier,
            monthly_gap=monthly_gap,
            current_monthly_net=current_monthly_net,
            required_monthly=required_monthly,
            achievable_percentage=achievable_percentage,
        )

        return {
            "current_monthly_net": round(current_monthly_net, 0),
            "achievable_amount": round(achievable_amount, 0),
            "achievable_percentage": round(achievable_percentage, 2),
            "required_monthly": round(required_monthly, 0),
            "monthly_gap": round(monthly_gap, 0),
            "status_tier": status_tier,
            "recommendation": recommendation,
            "data_source": period_display,
            "months_remaining": months_remaining,
            "trend_months_requested": trend_months,
            "trend_months_actual": actual_months_used,
        }

    @staticmethod
    def _generate_recommendation(
        status_tier: str,
        monthly_gap: int,
        current_monthly_net: int,
        required_monthly: int,
        achievable_percentage: float,
    ) -> str:
        """Generate actionable recommendation based on achievability metrics.

        Args:
            status_tier: Status tier (on_track, achievable, challenging, deficit, severe_deficit)
            monthly_gap: Gap between required and current monthly net
            current_monthly_net: Current monthly net cashflow
            required_monthly: Required monthly savings
            achievable_percentage: Achievable percentage

        Returns:
            Recommendation text
        """
        if status_tier == "on_track":
            return (
                f"Great job! You're on track to exceed your goal. "
                f"Consider increasing your target or maintaining this pace."
            )
        elif status_tier == "achievable":
            return (
                f"You're close! Increase monthly savings by ¥{abs(monthly_gap):,} "
                f"to stay on track. Small adjustments to spending can help."
            )
        elif status_tier == "challenging":
            return (
                f"Challenging but possible. You need ¥{abs(monthly_gap):,}/month more. "
                f"Review discretionary spending or consider adjusting your goal timeline."
            )
        elif status_tier == "deficit":
            return (
                f"Your goal is at risk. Current monthly net (¥{current_monthly_net:,}) "
                f"needs to increase by ¥{abs(monthly_gap):,}. "
                f"Consider: (1) Cut expenses significantly, or (2) Lower target amount."
            )
        else:  # severe_deficit
            if current_monthly_net < 0:
                return (
                    f"Critical: You're losing ¥{abs(current_monthly_net):,}/month. "
                    f"Immediate action required: (1) Cut expenses by ¥{abs(monthly_gap):,}/month, "
                    f"or (2) Revise goal to realistic level. Current pace: {achievable_percentage:.1f}%."
                )
            else:
                return (
                    f"Your savings rate (¥{current_monthly_net:,}/month) is far below "
                    f"required (¥{required_monthly:,}/month). "
                    f"Consider: (1) Increase income, (2) Reduce expenses by ¥{abs(monthly_gap):,}, "
                    f"or (3) Adjust goal amount."
                )
