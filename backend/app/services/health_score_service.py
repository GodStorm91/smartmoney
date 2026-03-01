"""Financial Health Score service — composite 0-100 score from user data."""

from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.account import Account
from ..models.budget import Budget, BudgetAllocation
from ..models.goal import Goal
from ..models.transaction import Transaction
from ..services.account_service import AccountService
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy


# Asset account types
ASSET_TYPES = {"bank", "cash", "investment", "receivable"}
LIQUID_TYPES = {"bank", "cash"}
LIABILITY_TYPES = {"credit_card"}

# Grade mapping
GRADE_MAP = [
    (90, "A+"),
    (80, "A"),
    (70, "B+"),
    (60, "B"),
    (50, "C"),
    (0, "D"),
]


def _lerp(value: float, low: float, high: float, max_pts: float) -> float:
    """Linear interpolation between 0 and max_pts for value in [low, high]."""
    if value <= low:
        return 0.0
    if value >= high:
        return max_pts
    return (value - low) / (high - low) * max_pts


def _grade(score: int) -> str:
    for threshold, grade in GRADE_MAP:
        if score >= threshold:
            return grade
    return "D"


class HealthScoreService:
    """Calculate a weighted financial health score from existing data."""

    @staticmethod
    def calculate_health_score(db: Session, user_id: int) -> dict:
        """Calculate composite health score for a user.

        Returns dict with score, grade, components, and tips.
        """
        rates = ExchangeRateService.get_cached_rates(db)
        components = []

        # 1. Savings Rate (25 pts)
        sr_score, sr_detail = HealthScoreService._savings_rate(db, user_id, rates)
        components.append({"name": "savings_rate", "score": sr_score, "max": 25, "detail": sr_detail})

        # 2. Budget Adherence (20 pts)
        ba_score, ba_detail = HealthScoreService._budget_adherence(db, user_id, rates)
        components.append({"name": "budget_adherence", "score": ba_score, "max": 20, "detail": ba_detail})

        # 3. Debt Ratio (20 pts)
        dr_score, dr_detail = HealthScoreService._debt_ratio(db, user_id, rates)
        components.append({"name": "debt_ratio", "score": dr_score, "max": 20, "detail": dr_detail})

        # 4. Emergency Fund (15 pts)
        ef_score, ef_detail = HealthScoreService._emergency_fund(db, user_id, rates)
        components.append({"name": "emergency_fund", "score": ef_score, "max": 15, "detail": ef_detail})

        # 5. Goal Progress (10 pts)
        gp_score, gp_detail = HealthScoreService._goal_progress(db, user_id)
        components.append({"name": "goal_progress", "score": gp_score, "max": 10, "detail": gp_detail})

        # 6. Consistency (10 pts)
        co_score, co_detail = HealthScoreService._consistency(db, user_id)
        components.append({"name": "consistency", "score": co_score, "max": 10, "detail": co_detail})

        total = round(sum(c["score"] for c in components))
        tips = HealthScoreService._generate_tips(components)

        return {
            "score": total,
            "grade": _grade(total),
            "components": components,
            "tips": tips,
        }

    # ------------------------------------------------------------------
    # Component calculators
    # ------------------------------------------------------------------

    @staticmethod
    def _savings_rate(db: Session, user_id: int, rates: dict) -> tuple[float, str]:
        """Savings Rate (25 pts): (income - expenses) / income."""
        today = date.today()
        month_key = today.strftime("%Y-%m")

        rows = (
            db.query(Transaction.amount, Transaction.currency, Transaction.is_income)
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                Transaction.month_key == month_key,
            )
            .all()
        )

        income = 0
        expenses = 0
        for row in rows:
            amt = convert_to_jpy(abs(row.amount), row.currency, rates)
            if row.is_income:
                income += amt
            else:
                expenses += amt

        if income <= 0:
            return 0.0, "No income this month"

        rate = (income - expenses) / income * 100
        # 0% -> 0, 10% -> 12, 20% -> 20, 30%+ -> 25
        if rate <= 0:
            score = 0.0
        elif rate <= 10:
            score = _lerp(rate, 0, 10, 12)
        elif rate <= 20:
            score = 12 + _lerp(rate, 10, 20, 8)
        elif rate <= 30:
            score = 20 + _lerp(rate, 20, 30, 5)
        else:
            score = 25.0

        return round(score, 1), f"{round(rate)}% savings rate"

    @staticmethod
    def _budget_adherence(db: Session, user_id: int, rates: dict) -> tuple[float, str]:
        """Budget Adherence (20 pts): how well user stays within budgets."""
        today = date.today()
        month_key = today.strftime("%Y-%m")

        budget = (
            db.query(Budget)
            .filter(Budget.user_id == user_id, Budget.month == month_key, Budget.is_active == True)
            .first()
        )

        if not budget:
            return 10.0, "No budgets set"

        allocations = (
            db.query(BudgetAllocation)
            .filter(BudgetAllocation.budget_id == budget.id)
            .all()
        )

        if not allocations:
            return 10.0, "No budget allocations"

        on_track = 0
        total = len(allocations)

        for alloc in allocations:
            spent = (
                db.query(func.sum(func.abs(Transaction.amount)))
                .filter(
                    Transaction.user_id == user_id,
                    ~Transaction.is_transfer,
                    ~Transaction.is_income,
                    Transaction.month_key == month_key,
                    Transaction.category == alloc.category,
                )
                .scalar()
            ) or 0

            spent_jpy = convert_to_jpy(spent, "JPY", rates)
            if alloc.amount > 0 and spent_jpy <= alloc.amount:
                on_track += 1

        ratio = on_track / total if total > 0 else 0
        if ratio >= 1.0:
            score = 20.0
        elif ratio >= 0.8:
            score = 15.0
        else:
            score = 5.0

        return score, f"{on_track}/{total} budgets on track"

    @staticmethod
    def _debt_ratio(db: Session, user_id: int, rates: dict) -> tuple[float, str]:
        """Debt Ratio (20 pts): liabilities / assets."""
        accounts = (
            db.query(Account)
            .filter(Account.user_id == user_id, Account.is_active == True)
            .all()
        )

        assets = 0
        liabilities = 0

        for acct in accounts:
            balance = AccountService.calculate_balance(db, user_id, acct.id)
            balance_jpy = convert_to_jpy(abs(balance), acct.currency, rates)

            if acct.type in ASSET_TYPES:
                assets += balance_jpy
            elif acct.type in LIABILITY_TYPES:
                liabilities += abs(balance_jpy)

        if assets <= 0 and liabilities <= 0:
            return 15.0, "No accounts"

        if assets <= 0:
            return 0.0, "No assets"

        ratio = liabilities / assets * 100
        if ratio == 0:
            score = 20.0
        elif ratio < 30:
            score = 15.0
        elif ratio < 60:
            score = 10.0
        elif ratio < 80:
            score = 5.0
        else:
            score = 0.0

        return score, f"{round(ratio)}% debt ratio"

    @staticmethod
    def _emergency_fund(db: Session, user_id: int, rates: dict) -> tuple[float, str]:
        """Emergency Fund (15 pts): liquid_assets / monthly_expenses."""
        accounts = (
            db.query(Account)
            .filter(
                Account.user_id == user_id,
                Account.is_active == True,
                Account.type.in_(list(LIQUID_TYPES)),
            )
            .all()
        )

        liquid = 0
        for acct in accounts:
            balance = AccountService.calculate_balance(db, user_id, acct.id)
            if balance > 0:
                liquid += convert_to_jpy(balance, acct.currency, rates)

        # Average monthly expenses over last 3 months
        today = date.today()
        three_months_ago = today - timedelta(days=90)
        total_expenses = (
            db.query(func.sum(func.abs(Transaction.amount)))
            .filter(
                Transaction.user_id == user_id,
                ~Transaction.is_transfer,
                ~Transaction.is_income,
                Transaction.date >= three_months_ago,
            )
            .scalar()
        ) or 0

        monthly_expenses = total_expenses / 3 if total_expenses > 0 else 0

        if monthly_expenses <= 0:
            months_covered = 6 if liquid > 0 else 0
        else:
            months_covered = liquid / monthly_expenses

        if months_covered >= 6:
            score = 15.0
        elif months_covered >= 3:
            score = 10.0
        elif months_covered >= 1:
            score = 5.0
        else:
            score = 0.0

        return score, f"{round(months_covered, 1)} months coverage"

    @staticmethod
    def _goal_progress(db: Session, user_id: int) -> tuple[float, str]:
        """Goal Progress (10 pts): average progress across active goals."""
        goals = db.query(Goal).filter(Goal.user_id == user_id).all()

        if not goals:
            return 5.0, "No goals set"

        from ..services.goal_service import GoalService

        total_pct = 0
        count = 0
        for goal in goals:
            progress = GoalService.calculate_goal_progress(db, user_id, goal)
            total_pct += min(progress.get("progress_pct", 0), 100)
            count += 1

        avg_pct = total_pct / count if count > 0 else 0
        # Scale 0-100% progress to 0-10 pts
        score = avg_pct / 100 * 10

        return round(score, 1), f"{round(avg_pct)}% average progress"

    @staticmethod
    def _consistency(db: Session, user_id: int) -> tuple[float, str]:
        """Consistency (10 pts): transaction count in last 30 days."""
        cutoff = date.today() - timedelta(days=30)
        count = (
            db.query(func.count(Transaction.id))
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= cutoff,
            )
            .scalar()
        ) or 0

        if count >= 31:
            score = 10.0
        elif count >= 11:
            score = 7.0
        elif count >= 1:
            score = 3.0
        else:
            score = 0.0

        return score, f"{count} transactions in 30 days"

    # ------------------------------------------------------------------
    # Tips generator
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_tips(components: list[dict]) -> list[str]:
        """Generate 1-3 actionable tips from lowest-scoring components."""
        tips_map = {
            "savings_rate": "Increase your savings rate to improve your score",
            "budget_adherence": "Stay within your budget allocations this month",
            "debt_ratio": "Pay down debt to improve your debt ratio",
            "emergency_fund": "Build your emergency fund to cover 3-6 months of expenses",
            "goal_progress": "Set up financial goals to track your progress",
            "consistency": "Log transactions regularly to improve tracking consistency",
        }

        # Sort by gap (max - score), largest gap first
        sorted_components = sorted(components, key=lambda c: c["max"] - c["score"], reverse=True)

        tips = []
        for comp in sorted_components[:3]:
            gap = comp["max"] - comp["score"]
            if gap > 0:
                tip = tips_map.get(comp["name"], "")
                if tip:
                    pts_gain = round(gap)
                    tips.append(f"{tip} (+{pts_gain} pts)")

        return tips


# Singleton accessor
_instance = None


def get_health_score_service() -> HealthScoreService:
    """Get singleton HealthScoreService instance."""
    global _instance
    if _instance is None:
        _instance = HealthScoreService()
    return _instance
