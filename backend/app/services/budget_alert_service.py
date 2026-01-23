"""Budget alert service for threshold calculations and alert generation."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from sqlalchemy.orm import joinedload
from ..models.budget import Budget, BudgetAllocation
from ..models.transaction import Transaction
from ..models.budget_alert import BudgetAlert
from ..schemas.budget_alert import BudgetAlertCreate


class BudgetAlertService:
    """Service for budget alert operations."""

    # Threshold percentages
    THRESHOLDS = [50, 80, 100]

    @staticmethod
    def calculate_category_spending(
        db: Session, user_id: int, month: str, category: Optional[str] = None
    ) -> dict:
        """Calculate spending by category for a month.

        Returns dict with category as key and spending amount as value.
        """
        # Parse month to get date range
        year, month_num = map(int, month.split("-"))
        month_start = datetime(year, month_num, 1)

        if month_num == 12:
            month_end = datetime(year + 1, 1, 1)
        else:
            month_end = datetime(year, month_num + 1, 1)

        # Build query for expenses
        query = db.query(
            Transaction.category,
            Transaction.subcategory,
            func.sum(Transaction.amount).label("total"),
        ).filter(
            Transaction.user_id == user_id,
            Transaction.is_income == False,
            Transaction.is_transfer == False,
            Transaction.is_adjustment == False,
            Transaction.date >= month_start.date(),
            Transaction.date < month_end.date(),
        )

        if category:
            query = query.filter(Transaction.category == category)

        results = query.group_by(Transaction.category, Transaction.subcategory).all()

        # Combine category totals (including subcategories)
        category_totals = {}
        for cat, subcat, total in results:
            cat_key = cat or "Uncategorized"
            category_totals[cat_key] = category_totals.get(cat_key, 0) + (total or 0)

        return category_totals

    @staticmethod
    def get_budget_with_allocations(db: Session, user_id: int, month: str) -> Optional[Budget]:
        """Get budget with allocations for a user and month."""
        return (
            db.query(Budget)
            .options(joinedload(Budget.allocations))
            .filter(Budget.user_id == user_id, Budget.month == month)
            .first()
        )

    @staticmethod
    def check_thresholds(
        db: Session,
        user_id: int,
        budget: Budget,
        category: Optional[str] = None,
        current_spending: int = 0,
    ) -> list[dict]:
        """Check spending against budget thresholds.

        Returns list of threshold alerts to generate.
        """
        alerts = []

        # Get budget amount for this category
        budget_amount = None
        if category:
            allocation = next((a for a in budget.allocations if a.category == category), None)
            if allocation:
                budget_amount = allocation.amount
        else:
            # Total budget (sum of all allocations)
            budget_amount = sum(a.amount for a in budget.allocations)

        if budget_amount is None or budget_amount == 0:
            return alerts

        percentage = (current_spending / budget_amount) * 100
        amount_remaining = budget_amount - current_spending

        # Check each threshold
        for threshold in BudgetAlertService.THRESHOLDS:
            if percentage >= threshold:
                # Check if alert already exists for this threshold today
                alert_type = f"threshold_{threshold}"
                if threshold == 100:
                    alert_type = (
                        "over_budget" if current_spending > budget_amount else "threshold_100"
                    )

                existing_alert = (
                    db.query(BudgetAlert)
                    .filter(
                        BudgetAlert.budget_id == budget.id,
                        BudgetAlert.category == category,
                        BudgetAlert.alert_type == alert_type,
                        BudgetAlert.is_read == False,
                    )
                    .first()
                )

                if not existing_alert:
                    alerts.append(
                        {
                            "alert_type": alert_type,
                            "threshold_percentage": Decimal(str(percentage)),
                            "current_spending": current_spending,
                            "budget_amount": budget_amount,
                            "amount_remaining": amount_remaining,
                        }
                    )

        return alerts

    @staticmethod
    def generate_alerts_for_transaction(
        db: Session, user_id: int, transaction_category: str, transaction_amount: int
    ) -> list[BudgetAlert]:
        """Generate budget alerts when a transaction is added.

        Called after transaction creation to check if new alerts should be generated.
        """
        alerts = []

        # Get current month budget
        today = datetime.now()
        month = today.strftime("%Y-%m")
        budget = BudgetAlertService.get_budget_with_allocations(db, user_id, month)

        if not budget:
            return alerts

        # Calculate total spending including new transaction
        spending = BudgetAlertService.calculate_category_spending(
            db, user_id, month, transaction_category
        )
        total_spending = spending.get(transaction_category, 0) + transaction_amount

        # Check thresholds
        new_alerts = BudgetAlertService.check_thresholds(
            db, user_id, budget, transaction_category, total_spending
        )

        # Create alert records
        for alert_data in new_alerts:
            alert_create = BudgetAlertCreate(
                budget_id=budget.id,
                user_id=user_id,
                category=transaction_category,
                alert_type=alert_data["alert_type"],
                threshold_percentage=alert_data["threshold_percentage"],
                current_spending=alert_data["current_spending"],
                budget_amount=alert_data["budget_amount"],
                amount_remaining=alert_data["amount_remaining"],
            )
            alert = BudgetAlert(**alert_create.model_dump())
            db.add(alert)
            alerts.append(alert)

        if alerts:
            db.commit()

        return alerts

    @staticmethod
    def get_alerts(
        db: Session, user_id: int, unread_only: bool = False, limit: int = 50
    ) -> tuple[list[BudgetAlert], int, int]:
        """Get budget alerts for a user."""
        query = (
            db.query(BudgetAlert)
            .filter(BudgetAlert.user_id == user_id)
            .order_by(desc(BudgetAlert.created_at))
        )

        if unread_only:
            query = query.filter(BudgetAlert.is_read == False)

        alerts = query.limit(limit).all()
        total_count = db.query(BudgetAlert).filter(BudgetAlert.user_id == user_id).count()
        unread_count = (
            db.query(BudgetAlert)
            .filter(BudgetAlert.user_id == user_id, BudgetAlert.is_read == False)
            .count()
        )

        return alerts, total_count, unread_count

    @staticmethod
    def get_threshold_status(db: Session, user_id: int, budget_id: int) -> dict:
        """Get detailed threshold status for a budget."""
        budget = (
            db.query(Budget)
            .options(joinedload(Budget.allocations))
            .filter(Budget.id == budget_id, Budget.user_id == user_id)
            .first()
        )

        if not budget:
            return {}

        # Calculate total spending
        year, month_num = map(int, budget.month.split("-"))
        month_start = datetime(year, month_num, 1)

        if month_num == 12:
            month_end = datetime(year + 1, 1, 1)
        else:
            month_end = datetime(year, month_num + 1, 1)

        total_spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_income == False,
                Transaction.is_transfer == False,
                Transaction.is_adjustment == False,
                Transaction.date >= month_start.date(),
                Transaction.date < month_end.date(),
            )
            .scalar()
            or 0
        )

        total_budget = sum(a.amount for a in budget.allocations)
        percentage_used = (total_spent / total_budget * 100) if total_budget > 0 else 0

        # Calculate category status
        spending = BudgetAlertService.calculate_category_spending(db, user_id, budget.month)
        category_status = []

        for allocation in budget.allocations:
            spent = spending.get(allocation.category, 0)
            percentage = (spent / allocation.amount * 100) if allocation.amount > 0 else 0

            if percentage >= 100:
                status = "over_budget"
            elif percentage >= 80:
                status = "threshold_80"
            elif percentage >= 50:
                status = "threshold_50"
            else:
                status = "normal"

            category_status.append(
                {
                    "category": allocation.category,
                    "budget_amount": allocation.amount,
                    "spent": spent,
                    "percentage": round(percentage, 2),
                    "status": status,
                }
            )

        # Calculate thresholds
        thresholds = {}
        for threshold in BudgetAlertService.THRESHOLDS:
            threshold_amount = int(total_budget * threshold / 100)
            is_exceeded = total_spent >= threshold_amount

            # Find when threshold was exceeded
            exceeded_at = None
            if is_exceeded:
                threshold_datetime = datetime(year, month_num, 1)
                exceeded_at = threshold_datetime

            thresholds[f"{threshold}_percent"] = {
                "threshold_amount": threshold_amount,
                "is_exceeded": is_exceeded,
                "exceeded_at": exceeded_at,
            }

        return {
            "budget_id": budget.id,
            "month_key": budget.month,
            "total_budget": total_budget,
            "total_spent": total_spent,
            "percentage_used": round(percentage_used, 2),
            "is_over_budget": total_spent > total_budget,
            "thresholds": thresholds,
            "category_status": category_status,
        }

    @staticmethod
    def mark_as_read(db: Session, alert_id: int, user_id: int) -> Optional[BudgetAlert]:
        """Mark an alert as read."""
        alert = (
            db.query(BudgetAlert)
            .filter(BudgetAlert.id == alert_id, BudgetAlert.user_id == user_id)
            .first()
        )

        if alert:
            alert.is_read = True
            db.commit()
            db.refresh(alert)

        return alert

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        """Mark all alerts as read for a user."""
        updated = (
            db.query(BudgetAlert)
            .filter(BudgetAlert.user_id == user_id, BudgetAlert.is_read == False)
            .update({"is_read": True})
        )

        db.commit()
        return updated
