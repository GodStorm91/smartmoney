"""Analytics service: spending insights and anomaly detection."""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from ..models.budget import Budget
from .analytics_category_service import CategoryAnalyticsService


class InsightsAnalyticsService:
    """Spending insights: spike detection, budget alerts, trend summaries."""

    @staticmethod
    def generate_spending_insights(db: Session, user_id: int) -> list[dict]:
        """Generate smart spending insights for a user.

        Returns:
            List of insight dicts with type, severity, title, message
        """
        insights: list[dict] = []
        today = date.today()
        current_month_start = today.replace(day=1)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        last_month_end = current_month_start - timedelta(days=1)

        current_spending = CategoryAnalyticsService.get_category_spending(
            db, user_id, current_month_start, today
        )
        last_spending = CategoryAnalyticsService.get_category_spending(
            db, user_id, last_month_start, last_month_end
        )

        # 1. Per-category spike / saving detection
        for category, amount in current_spending.items():
            last_amount = last_spending.get(category, 0)
            if last_amount > 0:
                change = ((amount - last_amount) / last_amount) * 100
                if change > 30:
                    insights.append(
                        {
                            "type": "spike",
                            "severity": "warning",
                            "title": f"{category} spending increased",
                            "message": f"Up {change:.0f}% compared to last month",
                            "category": category,
                            "amount": amount,
                            "percentage_change": round(change, 1),
                        }
                    )
                elif change < -20:
                    insights.append(
                        {
                            "type": "saving",
                            "severity": "success",
                            "title": f"{category} spending decreased",
                            "message": f"Down {abs(change):.0f}% compared to last month",
                            "category": category,
                            "amount": amount,
                            "percentage_change": round(change, 1),
                        }
                    )

        # 2. Budget alerts
        budgets = (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                Budget.month == current_month_start.strftime("%Y-%m"),
            )
            .all()
        )
        for budget in budgets:
            for alloc in budget.allocations:
                spent = current_spending.get(alloc.category, 0)
                if alloc.amount > 0:
                    usage = (spent / alloc.amount) * 100
                    if usage >= 100:
                        insights.append(
                            {
                                "type": "budget",
                                "severity": "warning",
                                "title": f"{alloc.category} budget exceeded",
                                "message": f"Spent {usage:.0f}% of budget",
                                "category": alloc.category,
                                "amount": spent,
                                "percentage_change": round(usage - 100, 1),
                            }
                        )
                    elif usage >= 80:
                        insights.append(
                            {
                                "type": "budget",
                                "severity": "info",
                                "title": f"{alloc.category} budget at {usage:.0f}%",
                                "message": "Approaching budget limit",
                                "category": alloc.category,
                                "amount": spent,
                                "percentage_change": round(usage, 1),
                            }
                        )

        # 3. Overall spending trend
        current_total = sum(current_spending.values())
        last_total = sum(last_spending.values())
        if last_total > 0:
            total_change = ((current_total - last_total) / last_total) * 100
            if total_change > 20:
                insights.append(
                    {
                        "type": "trend",
                        "severity": "warning",
                        "title": "Overall spending up",
                        "message": f"Total spending increased {total_change:.0f}% this month",
                        "amount": current_total,
                        "percentage_change": round(total_change, 1),
                    }
                )
            elif total_change < -10:
                insights.append(
                    {
                        "type": "trend",
                        "severity": "success",
                        "title": "Great job saving!",
                        "message": f"Total spending down {abs(total_change):.0f}% this month",
                        "amount": current_total,
                        "percentage_change": round(total_change, 1),
                    }
                )

        # 4. Top spending category dominance
        if current_spending and current_total > 0:
            top_category = max(current_spending, key=current_spending.get)  # type: ignore[arg-type]
            top_amount = current_spending[top_category]
            percentage = (top_amount / current_total) * 100
            if percentage > 40:
                insights.append(
                    {
                        "type": "unusual",
                        "severity": "info",
                        "title": f"{top_category} is top expense",
                        "message": f"Accounts for {percentage:.0f}% of spending",
                        "category": top_category,
                        "amount": top_amount,
                        "percentage_change": round(percentage, 1),
                    }
                )

        return insights
