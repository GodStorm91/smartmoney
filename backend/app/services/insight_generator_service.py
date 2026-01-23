"""Insight Generator Service - Generate proactive spending insights."""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING, Any
import statistics

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, joinedload

from ..models import InsightCard, Transaction, Goal, Budget, BudgetAllocation

if TYPE_CHECKING:
    from ..models.user import User


class InsightGeneratorService:
    """Generate proactive spending insights from transaction data."""

    async def generate_dashboard_insights(
        self, db: Session, user_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Generate all insights for dashboard display."""
        insights = []

        # 1. Spending trend insights
        trend_insights = await self._analyze_spending_trends(db, user_id)
        insights.extend(trend_insights)

        # 2. Budget burn rate insights
        budget_insights = await self._analyze_budget_burn(db, user_id)
        insights.extend(budget_insights)

        # 3. Goal progress insights
        goal_insights = await self._analyze_goal_progress(db, user_id)
        insights.extend(goal_insights)

        # 4. Forecast insights
        forecast_insights = await self._generate_forecasts(db, user_id)
        insights.extend(forecast_insights)

        # Sort by priority and return top N
        insights.sort(key=lambda x: x.get("priority", 5))
        return insights[:limit]

    async def _analyze_spending_trends(self, db: Session, user_id: int) -> list[dict[str, Any]]:
        """Analyze spending trends and identify notable changes."""
        current_month = datetime.now().strftime("%Y-%m")
        last_month = (datetime.now() - timedelta(days=30)).strftime("%Y-%m")
        two_months_ago = (datetime.now() - timedelta(days=60)).strftime("%Y-%m")

        current_spending = await self._get_monthly_spending_by_category(db, user_id, current_month)
        last_spending = await self._get_monthly_spending_by_category(db, user_id, last_month)
        previous_spending = await self._get_monthly_spending_by_category(
            db, user_id, two_months_ago
        )

        insights = []

        for category, amount in current_spending.items():
            prev_amount = last_spending.get(category, 0)
            two_prev_amount = previous_spending.get(category, 0)

            if prev_amount > 0:
                change = (amount - prev_amount) / prev_amount

                if change > 0.3:
                    severity = 1 if change > 0.5 else 2
                    insights.append(
                        {
                            "type": "spending_trend",
                            "title": f"{category} spending up",
                            "message": f"You're spending {change * 100:.0f}% more on {category} this month (¥{amount:,} vs ¥{prev_amount:,} last month)",
                            "priority": severity,
                            "data": {
                                "category": category,
                                "current": amount,
                                "previous": prev_amount,
                                "change_percent": change * 100,
                            },
                            "action_url": "/analytics",
                            "action_label": "View Analytics",
                        }
                    )
                elif change < -0.3:
                    insights.append(
                        {
                            "type": "spending_trend",
                            "title": f"Good progress on {category}",
                            "message": f"You've reduced {category} spending by {abs(change) * 100:.0f}% compared to last month!",
                            "priority": 4,
                            "data": {
                                "category": category,
                                "current": amount,
                                "previous": prev_amount,
                                "change_percent": change * 100,
                            },
                        }
                    )

            if two_prev_amount > 0:
                two_month_change = (amount - two_prev_amount) / two_prev_amount
                if two_month_change > 0.5:
                    insights.append(
                        {
                            "type": "spending_trend",
                            "title": f"{category} spending spike",
                            "message": f"{category} spending has increased 50%+ over the past 2 months. Consider reviewing this category.",
                            "priority": 2,
                            "data": {
                                "category": category,
                                "current": amount,
                                "two_months_ago": two_prev_amount,
                                "change_percent": two_month_change * 100,
                            },
                        }
                    )

        return insights

    async def _analyze_budget_burn(self, db: Session, user_id: int) -> list[dict[str, Any]]:
        """Analyze budget burn rate and forecast overage."""
        current_month_start = datetime.now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        current_month_end = (current_month_start + timedelta(days=32)).replace(day=1) - timedelta(
            days=1
        )

        budget = (
            db.query(Budget)
            .filter(and_(Budget.user_id == user_id, Budget.is_active == True))
            .first()
        )

        if not budget:
            return []

        current_spending = (
            db.query(func.sum(Transaction.amount))
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "expense",
                    Transaction.date >= current_month_start,
                    Transaction.date <= current_month_end,
                )
            )
            .scalar()
            or 0
        )

        day_of_month = datetime.now().day
        days_in_month = (current_month_end - current_month_start).days + 1
        days_remaining = max(1, days_in_month - day_of_month + 1)

        expected_spending = (budget.total_amount / days_in_month) * day_of_month
        burn_rate = current_spending / expected_spending if expected_spending > 0 else 1

        insights = []

        if burn_rate > 1.3:
            projected_over = current_spending - budget.total_amount
            insights.append(
                {
                    "type": "budget_warning",
                    "title": "Budget alert",
                    "message": f"You're spending {burn_rate * 100 - 100:.0f}% faster than budgeted. At this rate, you'll exceed your monthly budget by ¥{int(projected_over):,}",
                    "priority": 1,
                    "data": {
                        "current_spending": current_spending,
                        "budget": budget.total_amount,
                        "burn_rate": burn_rate,
                        "projected_over": projected_over,
                        "days_remaining": days_remaining,
                    },
                    "action_url": "/budget",
                    "action_label": "View Budget",
                }
            )
        elif burn_rate > 1.1:
            projected_over = current_spending - budget.total_amount
            insights.append(
                {
                    "type": "budget_warning",
                    "title": "Budget warning",
                    "message": f"You're spending {burn_rate * 100 - 100:.0f}% faster than budgeted. Consider reducing spending to stay within limits.",
                    "priority": 2,
                    "data": {
                        "current_spending": current_spending,
                        "budget": budget.total_amount,
                        "burn_rate": burn_rate,
                        "projected_over": projected_over,
                        "days_remaining": days_remaining,
                    },
                }
            )

        remaining_budget = budget.total_amount - current_spending
        daily_budget = remaining_budget / days_remaining if days_remaining > 0 else 0

        if remaining_budget > 0:
            insights.append(
                {
                    "type": "budget_info",
                    "title": "Budget status",
                    "message": f"You have ¥{int(remaining_budget):,} remaining for this month (¥{int(daily_budget):,}/day)",
                    "priority": 4,
                    "data": {
                        "remaining_budget": remaining_budget,
                        "daily_budget": daily_budget,
                        "days_remaining": days_remaining,
                    },
                }
            )

        return insights

    async def _analyze_goal_progress(self, db: Session, user_id: int) -> list[dict[str, Any]]:
        """Analyze goal progress and provide insights."""
        goals = db.query(Goal).filter(Goal.user_id == user_id).all()

        if not goals:
            return []

        insights = []

        for goal in goals:
            if goal.target_amount and goal.target_amount > 0:
                current_savings = goal.current_amount or 0
                progress_pct = (current_savings / goal.target_amount) * 100

                start_date = goal.start_date or datetime.now()
                end_date = goal.target_date or (start_date + timedelta(days=365 * goal.years))
                total_days = (end_date - start_date).days
                elapsed_days = max(1, (datetime.now() - start_date).days)
                expected_progress = (elapsed_days / total_days) * 100

                if progress_pct < expected_progress * 0.8:
                    months_behind = (expected_progress - progress_pct) / (
                        expected_progress / (elapsed_days / 30)
                    )
                    insights.append(
                        {
                            "type": "goal_progress",
                            "title": f"{goal.name} behind schedule",
                            "message": f"You're behind schedule on '{goal.name}'. At this pace, you won't reach your goal by {goal.years}-year target.",
                            "priority": 2,
                            "data": {
                                "goal_id": goal.id,
                                "goal_name": goal.name,
                                "current": current_savings,
                                "target": goal.target_amount,
                                "progress_percent": progress_pct,
                                "expected_percent": expected_progress,
                                "monthly_required": goal.monthly_required or 0,
                            },
                            "action_url": f"/goals",
                            "action_label": "View Goals",
                        }
                    )
                elif progress_pct >= 100:
                    insights.append(
                        {
                            "type": "goal_progress",
                            "title": f"Goal achieved: {goal.name}!",
                            "message": f"Congratulations! You've reached your {goal.name} goal!",
                            "priority": 1,
                            "data": {
                                "goal_id": goal.id,
                                "goal_name": goal.name,
                                "current": current_savings,
                                "target": goal.target_amount,
                            },
                        }
                    )
                elif progress_pct >= expected_progress * 0.9:
                    insights.append(
                        {
                            "type": "goal_progress",
                            "title": f"Great progress on {goal.name}",
                            "message": f"You're on track to reach '{goal.name}'! Keep up the good work.",
                            "priority": 4,
                            "data": {
                                "goal_id": goal.id,
                                "goal_name": goal.name,
                                "current": current_savings,
                                "target": goal.target_amount,
                                "progress_percent": progress_pct,
                            },
                        }
                    )

        return insights

    async def _generate_forecasts(self, db: Session, user_id: int) -> list[dict[str, Any]]:
        """Generate spending forecasts using historical data."""
        months_back = 6
        monthly_totals = []

        for i in range(months_back):
            month_start = (datetime.now() - timedelta(days=30 * i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

            total = (
                db.query(func.sum(Transaction.amount))
                .filter(
                    and_(
                        Transaction.user_id == user_id,
                        Transaction.type == "expense",
                        Transaction.date >= month_start,
                        Transaction.date <= month_end,
                    )
                )
                .scalar()
                or 0
            )

            monthly_totals.append(total)

        if len(monthly_totals) < 3:
            return []

        insights = []

        recent_avg = statistics.mean(monthly_totals[:3])
        historical_avg = statistics.mean(monthly_totals)

        if recent_avg > historical_avg * 1.2:
            trend = "increasing"
            forecast = recent_avg * 1.1
        elif recent_avg < historical_avg * 0.8:
            trend = "decreasing"
            forecast = recent_avg * 0.9
        else:
            trend = "stable"
            forecast = recent_avg

        next_month = (datetime.now() + timedelta(days=32)).replace(day=1)
        next_month_name = next_month.strftime("%B")

        if trend != "stable":
            insights.append(
                {
                    "type": "forecast",
                    "title": f"Spending forecast for {next_month_name}",
                    "message": f"Based on recent trends, your {next_month_name} spending is projected to be around ¥{int(forecast):,}. Your recent average is ¥{int(recent_avg):,}.",
                    "priority": 4,
                    "data": {
                        "forecast": forecast,
                        "recent_average": recent_avg,
                        "historical_average": historical_avg,
                        "trend": trend,
                        "monthly_totals": monthly_totals,
                    },
                }
            )

        savings_rate = await self._calculate_savings_rate(db, user_id)
        if savings_rate < 10 and savings_rate > 0:
            insights.append(
                {
                    "type": "savings_alert",
                    "title": "Low savings rate",
                    "message": f"Your current savings rate is {savings_rate:.1f}%. Financial experts recommend saving at least 20% of income.",
                    "priority": 3,
                    "data": {"savings_rate": savings_rate, "recommended": 20},
                    "action_url": "/goals",
                    "action_label": "Set Goals",
                }
            )
        elif savings_rate >= 30:
            insights.append(
                {
                    "type": "savings_positive",
                    "title": "Great savings rate!",
                    "message": f"You're saving {savings_rate:.1f}% of your income! That's excellent financial health.",
                    "priority": 4,
                    "data": {"savings_rate": savings_rate},
                }
            )

        return insights

    async def _calculate_savings_rate(self, db: Session, user_id: int) -> float:
        """Calculate current month savings rate."""
        current_month_start = datetime.now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        current_month_end = (current_month_start + timedelta(days=32)).replace(day=1) - timedelta(
            days=1
        )

        income = (
            db.query(func.sum(Transaction.amount))
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "income",
                    Transaction.date >= current_month_start,
                    Transaction.date <= current_month_end,
                )
            )
            .scalar()
            or 0
        )

        expenses = (
            db.query(func.sum(Transaction.amount))
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "expense",
                    Transaction.date >= current_month_start,
                    Transaction.date <= current_month_end,
                )
            )
            .scalar()
            or 0
        )

        if income <= 0:
            return 0

        return ((income - abs(expenses)) / income) * 100

    async def _get_monthly_spending_by_category(
        self, db: Session, user_id: int, month: str
    ) -> dict[str, int]:
        """Get spending by category for a specific month."""
        month_start = datetime.strptime(f"{month}-01", "%Y-%m-%d")
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        result = (
            db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.type == "expense",
                    Transaction.date >= month_start,
                    Transaction.date <= month_end,
                )
            )
            .group_by(Transaction.category)
            .all()
        )

        return {row.category: int(row.total) for row in result}

    async def save_insights_to_db(
        self, db: Session, user_id: int, insights: list[dict[str, Any]]
    ) -> None:
        """Save generated insights to database."""
        for insight in insights:
            existing = (
                db.query(InsightCard)
                .filter(
                    and_(
                        InsightCard.user_id == user_id,
                        InsightCard.type == insight["type"],
                        InsightCard.title == insight["title"],
                        InsightCard.is_read == False,
                    )
                )
                .first()
            )

            if not existing:
                new_insight = InsightCard(
                    user_id=user_id,
                    type=insight.get("type", "general"),
                    title=insight["title"],
                    message=insight["message"],
                    priority=insight.get("priority", 3),
                    data=insight.get("data", {}),
                    action_url=insight.get("action_url"),
                    action_label=insight.get("action_label"),
                )
                db.add(new_insight)

        db.commit()

    async def get_user_insights(
        self,
        db: Session,
        user_id: int,
        limit: int = 10,
        unread_only: bool = False,
        types: list[str] | None = None,
    ) -> list[InsightCard]:
        """Retrieve saved insights for a user."""
        query = db.query(InsightCard).filter(InsightCard.user_id == user_id)

        if unread_only:
            query = query.filter(InsightCard.is_read == False)

        if types:
            query = query.filter(InsightCard.type.in_(types))

        return (
            query.order_by(InsightCard.priority.asc(), InsightCard.created_at.desc())
            .limit(limit)
            .all()
        )

    async def dismiss_insight(self, db: Session, user_id: int, insight_id: int) -> bool:
        """Dismiss an insight card."""
        insight = (
            db.query(InsightCard)
            .filter(and_(InsightCard.id == insight_id, InsightCard.user_id == user_id))
            .first()
        )

        if insight:
            insight.is_read = True
            db.commit()
            return True

        return False

    async def mark_insight_read(self, db: Session, user_id: int, insight_id: int) -> bool:
        """Mark an insight as read."""
        insight = (
            db.query(InsightCard)
            .filter(and_(InsightCard.id == insight_id, InsightCard.user_id == user_id))
            .first()
        )

        if insight:
            insight.is_read = True
            db.commit()
            return True

        return False

    async def get_unread_count(self, db: Session, user_id: int) -> int:
        """Get count of unread insights."""
        return (
            db.query(InsightCard)
            .filter(and_(InsightCard.user_id == user_id, InsightCard.is_read == False))
            .count()
        )
