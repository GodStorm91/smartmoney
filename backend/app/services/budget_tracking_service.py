"""Budget tracking service for monitoring spending vs budget."""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.transaction import Transaction
from ..models.budget import Budget
from ..models.category import Category
from ..models.settings import AppSettings
from ..services.email_service import EmailService
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


class BudgetTrackingService:
    """Service for tracking budget spending and sending alerts."""

    @staticmethod
    def _build_category_hierarchy(db: Session, user_id: int) -> dict[str, list[str]]:
        """Build mapping of parent category names to child category names.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dict mapping parent category name -> list of child category names
        """
        hierarchy = {}

        # Get all parent categories (system + user's custom)
        parent_categories = db.query(Category).filter(
            Category.parent_id.is_(None),
            Category.type == "expense",
            (Category.is_system == True) | (Category.user_id == user_id)
        ).all()

        for parent in parent_categories:
            # Get all children for this parent
            children = db.query(Category).filter(
                Category.parent_id == parent.id,
                (Category.is_system == True) | (Category.user_id == user_id)
            ).all()

            child_names = [child.name for child in children]
            # Include parent name itself in case transactions use parent category directly
            hierarchy[parent.name] = [parent.name] + child_names

        return hierarchy

    @staticmethod
    def _get_spending_for_category(
        category_spending: dict[str, int],
        category_name: str,
        hierarchy: dict[str, list[str]]
    ) -> int:
        """Get total spending for a category including all its children.

        Args:
            category_spending: Dict of category name -> spending amount
            category_name: The budget allocation category name
            hierarchy: Parent -> children mapping

        Returns:
            Total spending amount for category and all children
        """
        # Get all category names to sum (parent + children)
        categories_to_sum = hierarchy.get(category_name, [category_name])

        total = 0
        for cat_name in categories_to_sum:
            total += category_spending.get(cat_name, 0)

        return total

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

        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Calculate spending per category for current month (with currency conversion)
        category_spending = {}
        spending_data = (
            db.query(
                Transaction.category,
                Transaction.amount,
                Transaction.currency
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_income == False,
                Transaction.is_transfer == False,
                Transaction.is_adjustment == False,
                Transaction.date >= month_start,
                Transaction.date <= month_end
            )
            .all()
        )

        # Sum amounts with currency conversion to JPY
        for row in spending_data:
            amount_jpy = convert_to_jpy(abs(row.amount), row.currency, rates)
            category_spending[row.category] = category_spending.get(row.category, 0) + amount_jpy

        # Build category hierarchy for parent -> children mapping
        hierarchy = BudgetTrackingService._build_category_hierarchy(db, user_id)

        # Build tracking items
        categories = []
        total_budgeted = 0
        total_spent = 0

        for allocation in budget.allocations:
            # Sum spending from parent category + all child categories
            spent = BudgetTrackingService._get_spending_for_category(
                category_spending, allocation.category, hierarchy
            )
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

        return {
            'month': current_month,
            'monthly_income': budget.monthly_income,
            'days_remaining': days_remaining,
            'safe_to_spend_today': safe_to_spend_today,
            'total_budgeted': total_budgeted,
            'total_spent': total_spent,
            'savings_target': budget.savings_target,
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
