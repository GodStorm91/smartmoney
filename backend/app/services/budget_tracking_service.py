"""Budget tracking service for monitoring spending vs budget."""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.transaction import Transaction
from ..models.budget import Budget
from ..models.settings import AppSettings
from ..services.email_service import EmailService


class BudgetTrackingService:
    """Service for tracking budget spending and sending alerts."""

    @staticmethod
    def get_budget_tracking(db: Session, user_id: int) -> dict | None:
        """Get current month's budget tracking data.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Budget tracking dict or None if no budget exists
        """
        # Get current month budget
        current_month = date.today().strftime("%Y-%m")
        budget = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == current_month
        ).first()

        if not budget:
            return None

        # Get current month start/end dates
        year, month = map(int, current_month.split('-'))
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month + 1, 1) - timedelta(days=1)

        # Calculate spending per category for current month
        category_spending = {}
        spending_data = (
            db.query(
                Transaction.category,
                func.sum(Transaction.amount).label("total")
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_income == False,
                Transaction.is_transfer == False,
                Transaction.is_adjustment == False,
                Transaction.date >= month_start,
                Transaction.date <= month_end
            )
            .group_by(Transaction.category)
            .all()
        )

        for row in spending_data:
            category_spending[row.category] = abs(row.total)

        # Build tracking items
        categories = []
        total_budgeted = 0
        total_spent = 0

        for allocation in budget.allocations:
            spent = category_spending.get(allocation.category, 0)
            remaining = allocation.amount - spent
            percentage = (spent / allocation.amount * 100) if allocation.amount > 0 else 0

            # Determine status color
            if percentage >= 100:
                status = 'red'
            elif percentage >= 80:
                status = 'orange'
            elif percentage >= 60:
                status = 'yellow'
            else:
                status = 'green'

            categories.append({
                'category': allocation.category,
                'budgeted': allocation.amount,
                'spent': spent,
                'remaining': remaining,
                'percentage': percentage,
                'status': status
            })

            total_budgeted += allocation.amount
            total_spent += spent

        # Calculate days remaining in month
        today = date.today()
        days_remaining = (month_end - today).days + 1

        # Calculate safe to spend today
        remaining_budget = total_budgeted - total_spent
        safe_to_spend_today = remaining_budget // days_remaining if days_remaining > 0 else 0

        # Calculate effective budget with carry-over
        carry_over = budget.carry_over or 0
        effective_budget = total_budgeted + carry_over

        return {
            'month': current_month,
            'monthly_income': budget.monthly_income,
            'days_remaining': days_remaining,
            'safe_to_spend_today': safe_to_spend_today,
            'total_budgeted': total_budgeted,
            'total_spent': total_spent,
            'savings_target': budget.savings_target,
            'carry_over': carry_over,
            'effective_budget': effective_budget,
            'categories': categories
        }

    @staticmethod
    def check_and_send_alerts(db: Session, user_id: int, user_email: str) -> dict:
        """Check budget thresholds and send email alerts if needed.

        Args:
            db: Database session
            user_id: User ID
            user_email: User email for alerts

        Returns:
            Dict with alert results
        """
        # Check if email alerts are enabled
        settings = db.query(AppSettings).filter(AppSettings.user_id == user_id).first()
        if not settings or not settings.budget_email_alerts:
            return {'alerts_sent': 0, 'message': 'Email alerts disabled'}

        # Get budget tracking
        tracking = BudgetTrackingService.get_budget_tracking(db, user_id)
        if not tracking:
            return {'alerts_sent': 0, 'message': 'No budget found'}

        email_service = EmailService()
        alerts_sent = 0

        # Check each category for alert thresholds
        for category in tracking['categories']:
            percentage = category['percentage']

            # Send 100% alert if exceeded
            if percentage >= 100 and category['status'] == 'red':
                success = email_service.send_budget_alert(
                    to_email=user_email,
                    category=category['category'],
                    budgeted=category['budgeted'],
                    spent=category['spent'],
                    percentage=percentage,
                    alert_type='100_percent'
                )
                if success:
                    alerts_sent += 1

            # Send 80% alert if at warning level
            elif percentage >= 80 and percentage < 100 and category['status'] == 'orange':
                success = email_service.send_budget_alert(
                    to_email=user_email,
                    category=category['category'],
                    budgeted=category['budgeted'],
                    spent=category['spent'],
                    percentage=percentage,
                    alert_type='80_percent'
                )
                if success:
                    alerts_sent += 1

        return {
            'alerts_sent': alerts_sent,
            'message': f'Sent {alerts_sent} budget alerts'
        }
