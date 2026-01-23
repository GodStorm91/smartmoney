"""Background job for monitoring budget thresholds."""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from .budget_alert_service import BudgetAlertService
from .budget_service import BudgetService
from .notification_service import NotificationService
from .notification_mixin import BudgetNotificationMixin

logger = logging.getLogger(__name__)


class BudgetMonitoringJob:
    """Job to monitor budget thresholds and trigger notifications."""

    def __init__(self):
        self.notification_service = NotificationService()
        self.notification_mixin = BudgetNotificationMixin()

    def check_all_budgets(self, db: Session) -> dict:
        """Check all active budgets for threshold violations.

        Returns:
            dict with 'budgets_checked', 'alerts_created', and 'notifications_sent' counts
        """
        # Get current month key
        current_month = datetime.now().strftime("%Y-%m")

        # Get all users with budgets for current month
        budgets = BudgetService.get_active_budgets(db, current_month)

        alerts_created = 0
        notifications_sent = 0

        for budget in budgets:
            try:
                result = self._check_budget(db, budget)
                alerts_created += result["alerts_created"]
                notifications_sent += result["notifications_sent"]
            except Exception as e:
                logger.error(f"Error checking budget {budget.id}: {e}")

        return {
            "budgets_checked": len(budgets),
            "alerts_created": alerts_created,
            "notifications_sent": notifications_sent,
        }

    def _check_budget(self, db: Session, budget) -> dict:
        """Check a single budget for threshold violations."""
        # Calculate spending for each allocation
        result = {"alerts_created": 0, "notifications_sent": 0}

        for allocation in budget.allocations:
            # Calculate current spending
            spending = BudgetAlertService.calculate_category_spending(
                db, budget.user_id, budget.month, allocation.category
            )
            current_spending = spending.get(allocation.category, 0)

            # Check thresholds
            alerts = BudgetAlertService.check_thresholds(
                db,
                budget.user_id,
                budget,
                allocation.category,
                current_spending,
            )

            # Create alerts and send notifications
            for alert_data in alerts:
                alert = self._create_alert(db, budget, allocation.category, alert_data)
                result["alerts_created"] += 1

                # Send notification
                notification_result = self.notification_mixin.send_budget_alert_notification(
                    db, alert
                )
                if notification_result.get("sent"):
                    result["notifications_sent"] += 1

        return result

    def _create_alert(self, db: Session, budget, category: str, alert_data: dict):
        """Create a budget alert record."""
        from ..models.budget_alert import BudgetAlert
        from ..schemas.budget_alert import BudgetAlertCreate

        alert_create = BudgetAlertCreate(
            user_id=budget.user_id,
            budget_id=budget.id,
            category=category,
            alert_type=alert_data["alert_type"],
            threshold_percentage=alert_data["threshold_percentage"],
            current_spending=alert_data["current_spending"],
            budget_amount=alert_data["budget_amount"],
            amount_remaining=alert_data["amount_remaining"],
        )

        alert = BudgetAlert(**alert_create.model_dump())
        db.add(alert)
        db.commit()
        db.refresh(alert)

        return alert
