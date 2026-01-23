"""Savings Recommender Service - Generate personalized savings recommendations."""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any
import statistics

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from ..models import SavingsRecommendation, Transaction, Bill

if TYPE_CHECKING:
    from ..models.user import User


class SavingsRecommenderService:
    """Analyze spending patterns and generate savings recommendations."""

    NEGOTIABLE_CATEGORIES = {
        "Insurance": {
            "market_rate": 15000,
            "negotiation_script": "Shop around for competing insurance quotes",
        },
        "Internet": {
            "market_rate": 5000,
            "negotiation_script": "Mention competitor promotions and ask for loyalty discounts",
        },
        "Mobile": {
            "market_rate": 3000,
            "negotiation_script": "Ask about loyalty discounts and family plans",
        },
        "Rent": {
            "market_rate": 0,
            "negotiation_script": "Mention moving intentions and ask for rent freeze",
        },
        "Utilities": {
            "market_rate": 8000,
            "negotiation_script": "Ask about budget billing plans and energy-saving programs",
        },
    }

    EXPENSIVE_CATEGORIES = {
        "Shopping": {
            "suggestion": "Consider unsubscribing from marketing emails and using a wishlist before purchasing"
        },
        "Entertainment": {
            "suggestion": "Review subscriptions and consider sharing accounts or canceling unused ones"
        },
        "Food": {"suggestion": "Try meal prepping and limiting takeout to once per week"},
        "Transport": {"suggestion": "Consider public transportation or carpooling options"},
        "Subscriptions": {
            "suggestion": "Audit all subscriptions and cancel ones you don't use regularly"
        },
    }

    async def generate_recommendations(
        self, db: Session, user_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Generate personalized savings recommendations."""
        recommendations = []

        sub_recommendations = await self._audit_subscriptions(db, user_id)
        recommendations.extend(sub_recommendations)

        category_recommendations = await self._analyze_category_opportunities(db, user_id)
        recommendations.extend(category_recommendations)

        negotiation_recommendations = await self._find_negotiation_opportunities(db, user_id)
        recommendations.extend(negotiation_recommendations)

        bill_recommendations = await self._analyze_bills(db, user_id)
        recommendations.extend(bill_recommendations)

        recommendations.sort(key=lambda x: x.get("potential_savings", 0), reverse=True)
        return recommendations[:limit]

    async def _audit_subscriptions(self, db: Session, user_id: int) -> list[dict[str, Any]]:
        """Detect recurring subscriptions and identify savings opportunities."""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)

        transactions = (
            db.query(Transaction)
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.is_income == False,
                    Transaction.date >= start_date,
                    Transaction.date <= end_date,
                )
            )
            .all()
        )

        if not transactions:
            return []

        merchant_groups = defaultdict(list)
        for tx in transactions:
            key = (tx.description[:40].lower().strip(), abs(tx.amount))
            merchant_groups[key].append(tx)

        recommendations = []
        for (description, amount), txs in merchant_groups.items():
            if len(txs) >= 2:
                dates = sorted([tx.date for tx in txs])
                intervals = self._calculate_intervals(dates)

                if self._is_regular_interval(intervals):
                    monthly_cost = amount
                    if amount >= 500:
                        avg_interval = sum(intervals) / len(intervals)
                        if avg_interval <= 35:
                            recommendations.append(
                                {
                                    "category": "Subscription",
                                    "recommendation": f"Review subscription: {description[:35]} (¥{amount:,}/{'month' if avg_interval <= 35 else 'period'})",
                                    "potential_savings": amount
                                    if avg_interval <= 35
                                    else int(amount * 12 * 30 / avg_interval),
                                    "action_type": "subscription_cancel",
                                    "action_data": {
                                        "merchant": description[:40],
                                        "monthly_cost": amount
                                        if avg_interval <= 35
                                        else int(amount * 30 / avg_interval),
                                        "occurrences": len(txs),
                                        "avg_interval_days": int(avg_interval),
                                    },
                                }
                            )

        return recommendations

    async def _analyze_category_opportunities(
        self, db: Session, user_id: int
    ) -> list[dict[str, Any]]:
        """Find categories where spending could be optimized."""
        current_month_start = datetime.now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )

        current_spending = (
            db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.is_income == False,
                    Transaction.date >= current_month_start,
                )
            )
            .group_by(Transaction.category)
            .all()
        )

        current_dict = {row.category: int(row.total) for row in current_spending}

        historical_averages = {}
        for i in range(1, 4):
            month_start = (datetime.now() - timedelta(days=30 * i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

            monthly = (
                db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
                .filter(
                    and_(
                        Transaction.user_id == user_id,
                        Transaction.is_income == False,
                        Transaction.date >= month_start,
                        Transaction.date <= month_end,
                    )
                )
                .group_by(Transaction.category)
                .all()
            )

            for row in monthly:
                if row.category not in historical_averages:
                    historical_averages[row.category] = []
                historical_averages[row.category].append(int(row.total))

        recommendations = []
        for category, current in current_dict.items():
            if category in self.EXPENSIVE_CATEGORIES:
                historical = historical_averages.get(category, [current])
                avg_historical = sum(historical) / len(historical)

                if current > avg_historical * 1.15:
                    potential_savings = int((current - avg_historical) * 0.25)
                    if potential_savings >= 500:
                        suggestions = self.EXPENSIVE_CATEGORIES.get(category, {}).get(
                            "suggestion", ""
                        )
                        recommendations.append(
                            {
                                "category": category,
                                "recommendation": f"Reduce {category} spending by ¥{potential_savings:,}/month to match your average",
                                "potential_savings": potential_savings,
                                "action_type": "reduce_spending",
                                "action_data": {
                                    "category": category,
                                    "current": current,
                                    "historical_average": int(avg_historical),
                                    "target_reduction": potential_savings,
                                    "suggestion": suggestions,
                                },
                            }
                        )

        return recommendations

    async def _find_negotiation_opportunities(
        self, db: Session, user_id: int
    ) -> list[dict[str, Any]]:
        """Find bills that could be negotiated."""
        current_month_start = datetime.now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )

        current_spending = (
            db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
            .filter(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.is_income == False,
                    Transaction.date >= current_month_start,
                )
            )
            .group_by(Transaction.category)
            .all()
        )

        spending_dict = {row.category: int(row.total) for row in current_spending}

        recommendations = []
        for category, data in self.NEGOTIABLE_CATEGORIES.items():
            if data["market_rate"] > 0 and category in spending_dict:
                if spending_dict[category] > data["market_rate"] * 1.1:
                    potential_savings = int(spending_dict[category] - data["market_rate"])
                    if potential_savings >= 1000:
                        recommendations.append(
                            {
                                "category": category,
                                "recommendation": f"Consider negotiating your {category} bill. Market rate is ~¥{data['market_rate']:,}/month.",
                                "potential_savings": potential_savings,
                                "action_type": "negotiate",
                                "action_data": {
                                    "category": category,
                                    "current_spending": spending_dict[category],
                                    "market_rate": data["market_rate"],
                                    "suggestion": data["negotiation_script"],
                                },
                            }
                        )

        return recommendations

    async def _analyze_bills(self, db: Session, user_id: int) -> list[dict[str, Any]]:
        """Analyze bills for savings opportunities."""
        bills = db.query(Bill).filter(and_(Bill.user_id == user_id, Bill.is_active == True)).all()

        recommendations = []
        for bill in bills:
            if bill.amount >= 5000:
                days_until_due = (bill.next_due_date - datetime.now().date()).days
                if days_until_due > 7:
                    recommendations.append(
                        {
                            "category": bill.category or "Bill",
                            "recommendation": f"Bill due: {bill.name} (¥{bill.amount:,}) on {bill.next_due_date.strftime('%m/%d')}",
                            "potential_savings": int(bill.amount * 0.05),
                            "action_type": "optimize_payment",
                            "action_data": {
                                "bill_id": bill.id,
                                "bill_name": bill.name,
                                "amount": bill.amount,
                                "due_date": bill.next_due_date.isoformat(),
                                "days_until_due": days_until_due,
                            },
                        }
                    )

        return recommendations

    def _calculate_intervals(self, dates: list[datetime]) -> list[int]:
        """Calculate days between consecutive dates."""
        intervals = []
        for i in range(1, len(dates)):
            intervals.append((dates[i] - dates[i - 1]).days)
        return intervals

    def _is_regular_interval(self, intervals: list[int]) -> bool:
        """Check if intervals are regular (monthly, weekly)."""
        if len(intervals) < 2:
            return False

        avg = sum(intervals) / len(intervals)
        return all(abs(i - avg) / avg < 0.25 for i in intervals)

    async def save_recommendations(
        self, db: Session, user_id: int, recommendations: list[dict[str, Any]]
    ) -> None:
        """Save recommendations to database."""
        for rec in recommendations:
            existing = (
                db.query(SavingsRecommendation)
                .filter(
                    and_(
                        SavingsRecommendation.user_id == user_id,
                        SavingsRecommendation.category == rec["category"],
                        SavingsRecommendation.recommendation == rec["recommendation"],
                        SavingsRecommendation.status == "pending",
                    )
                )
                .first()
            )

            if not existing:
                new_rec = SavingsRecommendation(
                    user_id=user_id,
                    category=rec.get("category", "General"),
                    recommendation=rec["recommendation"],
                    potential_savings=rec.get("potential_savings", 0),
                    action_type=rec.get("action_type", "general"),
                    action_data=rec.get("action_data"),
                )
                db.add(new_rec)

        db.commit()

    async def get_user_recommendations(
        self, db: Session, user_id: int, limit: int = 10, status: str | None = None
    ) -> list[SavingsRecommendation]:
        """Retrieve saved recommendations for a user."""
        query = db.query(SavingsRecommendation).filter(SavingsRecommendation.user_id == user_id)

        if status:
            query = query.filter(SavingsRecommendation.status == status)

        return (
            query.order_by(
                SavingsRecommendation.potential_savings.desc(),
                SavingsRecommendation.created_at.desc(),
            )
            .limit(limit)
            .all()
        )

    async def apply_recommendation(self, db: Session, user_id: int, recommendation_id: int) -> bool:
        """Mark a recommendation as applied."""
        rec = (
            db.query(SavingsRecommendation)
            .filter(
                and_(
                    SavingsRecommendation.id == recommendation_id,
                    SavingsRecommendation.user_id == user_id,
                )
            )
            .first()
        )

        if rec:
            rec.status = "applied"
            rec.applied_at = datetime.now()
            db.commit()
            return True

        return False

    async def dismiss_recommendation(
        self, db: Session, user_id: int, recommendation_id: int, reason: str | None = None
    ) -> bool:
        """Dismiss a recommendation."""
        rec = (
            db.query(SavingsRecommendation)
            .filter(
                and_(
                    SavingsRecommendation.id == recommendation_id,
                    SavingsRecommendation.user_id == user_id,
                )
            )
            .first()
        )

        if rec:
            rec.status = "dismissed"
            rec.dismissed_at = datetime.now()
            db.commit()
            return True

        return False

    async def get_savings_potential(self, db: Session, user_id: int) -> dict[str, Any]:
        """Get summary of total potential savings."""
        recommendations = await self.get_user_recommendations(db, user_id, limit=50)

        total_potential = sum(
            rec.potential_savings for rec in recommendations if rec.status == "pending"
        )

        by_category: dict[str, int] = {}
        by_action_type: dict[str, int] = {}
        for rec in recommendations:
            if rec.status == "pending":
                by_category[rec.category] = by_category.get(rec.category, 0) + rec.potential_savings
                by_action_type[rec.action_type] = (
                    by_action_type.get(rec.action_type, 0) + rec.potential_savings
                )

        top_recommendations = [
            {
                "id": rec.id,
                "category": rec.category,
                "recommendation": rec.recommendation,
                "potential_savings": rec.potential_savings,
            }
            for rec in recommendations[:5]
            if rec.status == "pending"
        ]

        return {
            "total_potential": total_potential,
            "by_category": by_category,
            "by_action_type": by_action_type,
            "top_recommendations": top_recommendations,
            "pending_count": len([r for r in recommendations if r.status == "pending"]),
        }

    async def get_unread_count(self, db: Session, user_id: int) -> int:
        """Get count of pending recommendations."""
        return (
            db.query(SavingsRecommendation)
            .filter(
                and_(
                    SavingsRecommendation.user_id == user_id,
                    SavingsRecommendation.status == "pending",
                )
            )
            .count()
        )
