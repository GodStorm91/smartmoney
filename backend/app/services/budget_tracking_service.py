"""Budget tracking service for monitoring spending vs budget."""
import statistics
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
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
    def _resolve_allocation_to_hierarchy(
        allocation_name: str,
        hierarchy: dict[str, list[str]]
    ) -> str:
        """Resolve a budget allocation name to the best matching hierarchy key.

        Handles cases like "Food & Dining" matching the "Food" parent category.

        Args:
            allocation_name: The budget allocation category name
            hierarchy: Parent -> children mapping from _build_category_hierarchy

        Returns:
            The matched hierarchy key, or the original allocation_name if no match found
        """
        # 1. Exact match
        if allocation_name in hierarchy:
            return allocation_name

        # Build lowercase lookup: lowercase key -> original key
        lower_to_key = {k.lower(): k for k in hierarchy}

        alloc_lower = allocation_name.lower()

        # 2. Case-insensitive exact match
        if alloc_lower in lower_to_key:
            return lower_to_key[alloc_lower]

        # 3. Split by " & " or " and " and check if any part matches a hierarchy key
        for separator in [" & ", " and "]:
            if separator in alloc_lower:
                parts = [p.strip() for p in alloc_lower.split(separator)]
                for part in parts:
                    if part in lower_to_key:
                        return lower_to_key[part]

        # 4. Check if any single word in the allocation name matches a hierarchy key
        words = alloc_lower.split()
        for word in words:
            if word in lower_to_key:
                return lower_to_key[word]

        # 5. Check if the allocation name (or its parts) is a known child category,
        #    and map to its parent
        child_to_parent = {}
        for parent_key, children in hierarchy.items():
            for child in children:
                child_to_parent[child.lower()] = parent_key

        # Check full allocation name as child
        if alloc_lower in child_to_parent:
            return child_to_parent[alloc_lower]

        # Check split parts as children
        for separator in [" & ", " and "]:
            if separator in alloc_lower:
                parts = [p.strip() for p in alloc_lower.split(separator)]
                for part in parts:
                    if part in child_to_parent:
                        return child_to_parent[part]

        # No match found, return original
        return allocation_name

    @staticmethod
    def _build_child_to_parent_map(hierarchy: dict[str, list[str]]) -> dict[str, str]:
        """Build lowercase child-name -> parent-name lookup from hierarchy."""
        child_to_parent: dict[str, str] = {}
        for parent, children in hierarchy.items():
            for child in children:
                child_to_parent[child.lower()] = parent
        return child_to_parent

    @staticmethod
    def _tx_matches_category(
        tx_lower: str,
        lower_set: set[str],
        child_to_parent: dict[str, str],
        resolved_key: str,
    ) -> bool:
        """Check if a transaction category matches a budget allocation.

        Tries: exact match in lower_set, then DB-hierarchy parent lookup via
        child_to_parent, then alias lookup via CATEGORY_ALIASES.
        """
        if tx_lower in lower_set:
            return True
        # Check if tx category is a known child whose parent matches
        parent = child_to_parent.get(tx_lower)
        if parent and parent == resolved_key:
            return True
        # Check consolidated aliases
        from .budget_prompt_helpers import CATEGORY_ALIASES
        alias_parent = CATEGORY_ALIASES.get(tx_lower)
        if alias_parent and alias_parent == resolved_key:
            return True
        return False

    @staticmethod
    def _get_spending_for_category_with_matched(
        category_spending: dict[str, int],
        category_name: str,
        hierarchy: dict[str, list[str]]
    ) -> tuple[int, set[str]]:
        """Get total spending for a category, returning matched transaction category keys.

        Uses hierarchy parent lookup and consolidated aliases for robust matching.

        Returns:
            Tuple of (total spending, set of matched transaction category keys)
        """
        resolved_key = BudgetTrackingService._resolve_allocation_to_hierarchy(
            category_name, hierarchy
        )
        categories_to_sum = hierarchy.get(resolved_key, [category_name])
        lower_set = {name.lower() for name in categories_to_sum}
        child_to_parent = BudgetTrackingService._build_child_to_parent_map(hierarchy)

        total = 0
        matched: set[str] = set()
        for tx_cat, amount in category_spending.items():
            tx_lower = tx_cat.lower() if tx_cat else ""
            if BudgetTrackingService._tx_matches_category(
                tx_lower, lower_set, child_to_parent, resolved_key
            ):
                total += amount
                matched.add(tx_cat)

        return total, matched

    @staticmethod
    def get_budget_tracking(db: Session, user_id: int, month: str | None = None) -> dict | None:
        """Get budget tracking data for a specific month.

        Args:
            db: Database session
            user_id: User ID
            month: Optional month string (YYYY-MM), defaults to current month

        Returns:
            Budget tracking dict or None if no budget exists
        """
        # Get month budget
        target_month = month or date.today().strftime("%Y-%m")
        budget = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == target_month,
            Budget.is_active == True
        ).first()

        if not budget:
            return None

        # Get month start/end dates
        year, month_num = map(int, target_month.split('-'))
        month_start = date(year, month_num, 1)
        if month_num == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month_num + 1, 1) - timedelta(days=1)

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
        matched_tx_categories: set[str] = set()

        for allocation in budget.allocations:
            # Sum spending from parent category + all child categories
            spent, matched = BudgetTrackingService._get_spending_for_category_with_matched(
                category_spending, allocation.category, hierarchy
            )
            matched_tx_categories.update(matched)
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

        # Compute uncategorized spending (transactions not matched to any budget allocation)
        uncategorized_spending = 0
        uncategorized_transactions = []
        for tx_cat, amount in category_spending.items():
            if tx_cat not in matched_tx_categories:
                uncategorized_spending += amount
                uncategorized_transactions.append({
                    'category': tx_cat,
                    'amount': amount
                })

        # Calculate days remaining in month
        today = date.today()
        days_remaining = (month_end - today).days + 1

        # Calculate safe to spend today
        remaining_budget = total_budgeted - total_spent
        safe_to_spend_today = remaining_budget // days_remaining if days_remaining > 0 else 0

        return {
            'month': target_month,
            'monthly_income': budget.monthly_income,
            'days_remaining': days_remaining,
            'safe_to_spend_today': safe_to_spend_today,
            'total_budgeted': total_budgeted,
            'total_spent': total_spent,
            'savings_target': budget.savings_target,
            'categories': categories,
            'uncategorized_spending': uncategorized_spending,
            'uncategorized_transactions': uncategorized_transactions
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

    @staticmethod
    def get_category_history(
        db: Session,
        user_id: int,
        category: str,
        months: int = 3
    ) -> dict | None:
        """Get daily spending history for a category.

        Args:
            db: Database session
            user_id: User ID
            category: Category name (parent category)
            months: Number of months to look back (1-12, default 3)

        Returns:
            Dict with daily spending, monthly totals, avg daily, std deviation
        """
        # Calculate date range
        today = date.today()
        start_date = today - relativedelta(months=months)

        # Build category hierarchy to include children
        hierarchy = BudgetTrackingService._build_category_hierarchy(db, user_id)
        resolved_key = BudgetTrackingService._resolve_allocation_to_hierarchy(
            category, hierarchy
        )
        categories_to_query = list(hierarchy.get(resolved_key, [category]))

        # Also include legacy/alias names that resolve to this parent
        from .budget_prompt_helpers import CATEGORY_ALIASES
        for alias, parent in CATEGORY_ALIASES.items():
            if parent == resolved_key and alias not in [c.lower() for c in categories_to_query]:
                categories_to_query.append(alias)
                # Add title-cased version too (transactions may store "Healthcare" not "healthcare")
                categories_to_query.append(alias.title())

        # Get exchange rates for currency conversion
        rates = ExchangeRateService.get_cached_rates(db)

        # Query transactions for the category and its children
        transactions = (
            db.query(
                Transaction.date,
                Transaction.amount,
                Transaction.currency
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.category.in_(categories_to_query),
                Transaction.is_income == False,
                Transaction.is_transfer == False,
                Transaction.is_adjustment == False,
                Transaction.date >= start_date,
                Transaction.date <= today
            )
            .all()
        )

        if not transactions:
            return {
                'category': category,
                'daily_spending': [],
                'monthly_totals': [],
                'overall_avg_daily': 0.0,
                'std_deviation': 0.0
            }

        # Aggregate by day with currency conversion
        daily_data: dict[date, dict] = {}
        for tx in transactions:
            tx_date = tx.date
            amount_jpy = convert_to_jpy(abs(tx.amount), tx.currency, rates)

            if tx_date not in daily_data:
                daily_data[tx_date] = {'amount': 0, 'count': 0}
            daily_data[tx_date]['amount'] += amount_jpy
            daily_data[tx_date]['count'] += 1

        # Build daily spending list
        daily_spending = [
            {
                'date': d.strftime('%Y-%m-%d'),
                'amount': data['amount'],
                'transaction_count': data['count']
            }
            for d, data in sorted(daily_data.items(), reverse=True)
        ]

        # Aggregate by month
        monthly_data: dict[str, dict] = {}
        for d, data in daily_data.items():
            month_key = d.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {'total': 0, 'count': 0, 'days': set()}
            monthly_data[month_key]['total'] += data['amount']
            monthly_data[month_key]['count'] += data['count']
            monthly_data[month_key]['days'].add(d)

        # Build monthly totals with avg daily calculation
        monthly_totals = []
        for month_key in sorted(monthly_data.keys(), reverse=True):
            data = monthly_data[month_key]
            days_with_spending = len(data['days'])
            avg_daily = data['total'] // days_with_spending if days_with_spending > 0 else 0
            monthly_totals.append({
                'month': month_key,
                'total': data['total'],
                'avg_daily': avg_daily,
                'transaction_count': data['count']
            })

        # Calculate overall average daily and standard deviation
        daily_amounts = [data['amount'] for data in daily_data.values()]
        overall_avg_daily = sum(daily_amounts) / len(daily_amounts) if daily_amounts else 0.0

        if len(daily_amounts) >= 2:
            std_deviation = statistics.stdev(daily_amounts)
        else:
            std_deviation = 0.0

        return {
            'category': category,
            'daily_spending': daily_spending,
            'monthly_totals': monthly_totals,
            'overall_avg_daily': round(overall_avg_daily, 2),
            'std_deviation': round(std_deviation, 2)
        }
