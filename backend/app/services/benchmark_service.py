"""Spending benchmark service."""

import logging
from datetime import date, timedelta

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..models.benchmark import SpendingBenchmark
from ..models.transaction import Transaction
from ..models.user import User
from ..schemas.benchmark import (
    BenchmarkComparison,
    CategoryComparison,
    HouseholdProfile,
    NationalAverage,
)
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy

logger = logging.getLogger(__name__)


# Category mapping: SmartMoney → 家計調査
CATEGORY_MAPPING = {
    "Food": "食料",
    "Housing": "住居",
    "Utilities": "光熱・水道",
    "Transportation": "交通",
    "Communication": "通信",
    "Entertainment": "教養娯楽",
    "Health": "保健医療",
    "Shopping": ["被服", "家具・家事用品"],  # Sum of 2 categories
    "Education": "教育",
    "Other": "その他の消費支出",
}


class BenchmarkService:
    """Service for household spending benchmarks."""

    @staticmethod
    def get_household_profile(db: Session, user_id: int) -> HouseholdProfile | None:
        """Get user's household profile.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Household profile or None if not set
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.household_profile:
            return None

        return HouseholdProfile(**user.household_profile)

    @staticmethod
    def update_household_profile(
        db: Session, user_id: int, profile: HouseholdProfile
    ) -> HouseholdProfile:
        """Update user's household profile.

        Args:
            db: Database session
            user_id: User ID
            profile: New household profile

        Returns:
            Updated profile
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Save as JSON
        user.household_profile = profile.model_dump()
        db.commit()
        db.refresh(user)

        return HouseholdProfile(**user.household_profile)

    @staticmethod
    def get_user_spending_last_3_months(db: Session, user_id: int) -> dict[str, int]:
        """Get user's spending by category for last 3 months (averaged).

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Dict of {category: average_monthly_amount_jpy}
        """
        three_months_ago = date.today() - timedelta(days=90)
        rates = ExchangeRateService.get_cached_rates(db)

        transactions = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.date >= three_months_ago,
                Transaction.is_income == False,
                Transaction.is_transfer == False,
            )
            .all()
        )

        # Aggregate by category with currency conversion
        category_totals: dict[str, int] = {}
        for tx in transactions:
            amount_jpy = convert_to_jpy(abs(tx.amount), tx.currency, rates)
            category_totals[tx.category] = category_totals.get(tx.category, 0) + amount_jpy

        # Return monthly average
        return {cat: total // 3 for cat, total in category_totals.items()}

    @staticmethod
    def get_comparison(db: Session, user_id: int) -> BenchmarkComparison:
        """Get benchmark comparison for user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Benchmark comparison with category-level details

        Raises:
            ValueError: If household profile not set
        """
        # Get household profile
        profile = BenchmarkService.get_household_profile(db, user_id)
        if not profile:
            raise ValueError("Household profile not set")

        # Get user's spending
        user_spending = BenchmarkService.get_user_spending_last_3_months(db, user_id)

        # Get benchmarks with fallback hierarchy
        benchmarks = BenchmarkService._get_benchmarks_with_fallback(db, profile)

        # Compare each category
        comparisons: list[CategoryComparison] = []
        total_user = 0
        total_benchmark = 0

        for smartmoney_cat in CATEGORY_MAPPING.keys():
            user_amount = user_spending.get(smartmoney_cat, 0)
            benchmark_amount = BenchmarkService._get_benchmark_for_category(
                benchmarks, smartmoney_cat
            )

            # Skip if no data for this category
            if user_amount == 0 and benchmark_amount == 0:
                continue

            # Calculate difference
            if benchmark_amount > 0:
                diff_pct = ((user_amount - benchmark_amount) / benchmark_amount) * 100
            else:
                diff_pct = 0 if user_amount == 0 else 100

            # Determine status (±5% threshold for neutral)
            if diff_pct > 5:
                status = "over"
            elif diff_pct < -5:
                status = "under"
            else:
                status = "neutral"

            comparisons.append(
                CategoryComparison(
                    category=smartmoney_cat,
                    user_amount=user_amount,
                    benchmark_amount=benchmark_amount,
                    difference_pct=round(diff_pct, 1),
                    status=status,
                )
            )

            total_user += user_amount
            total_benchmark += benchmark_amount

        # Calculate overall difference
        overall_diff = (
            ((total_user - total_benchmark) / total_benchmark * 100)
            if total_benchmark > 0
            else 0
        )

        return BenchmarkComparison(
            user_profile=profile,
            comparisons=comparisons,
            total_user_spending=total_user,
            total_benchmark_spending=total_benchmark,
            overall_difference_pct=round(overall_diff, 1),
        )

    @staticmethod
    def _get_benchmarks_with_fallback(
        db: Session, profile: HouseholdProfile
    ) -> list[SpendingBenchmark]:
        """Get benchmarks with fallback hierarchy.

        Fallback: prefecture+quintile+size → prefecture only → national average

        Args:
            db: Database session
            profile: Household profile

        Returns:
            List of matching benchmarks
        """
        # Try 1: Full match (prefecture + quintile + size)
        benchmarks = (
            db.query(SpendingBenchmark)
            .filter(
                SpendingBenchmark.prefecture_code == profile.prefecture_code,
                SpendingBenchmark.income_quintile == profile.income_quintile,
                SpendingBenchmark.household_size == profile.household_size,
            )
            .all()
        )

        if benchmarks:
            logger.info("Found benchmarks with full profile match")
            return benchmarks

        # Try 2: Prefecture only
        benchmarks = (
            db.query(SpendingBenchmark)
            .filter(
                SpendingBenchmark.prefecture_code == profile.prefecture_code,
                SpendingBenchmark.income_quintile.is_(None),
                SpendingBenchmark.household_size.is_(None),
            )
            .all()
        )

        if benchmarks:
            logger.info("Found benchmarks with prefecture-only match")
            return benchmarks

        # Try 3: National average
        benchmarks = (
            db.query(SpendingBenchmark)
            .filter(
                SpendingBenchmark.prefecture_code.is_(None),
                SpendingBenchmark.income_quintile.is_(None),
                SpendingBenchmark.household_size.is_(None),
            )
            .all()
        )

        logger.info("Using national average benchmarks")
        return benchmarks

    @staticmethod
    def _get_benchmark_for_category(
        benchmarks: list[SpendingBenchmark], category: str
    ) -> int:
        """Get benchmark amount for a SmartMoney category.

        Args:
            benchmarks: List of benchmark records
            category: SmartMoney category name

        Returns:
            Benchmark amount in JPY
        """
        jp_categories = CATEGORY_MAPPING.get(category)
        if not jp_categories:
            return 0

        # Handle Shopping special case (sum of 2 categories)
        if isinstance(jp_categories, list):
            total = 0
            for jp_cat in jp_categories:
                for b in benchmarks:
                    if b.category == jp_cat:
                        total += b.monthly_amount
            return total

        # Single category mapping
        for b in benchmarks:
            # Match category or subcategory
            if b.category == jp_categories or b.subcategory == jp_categories:
                return b.monthly_amount

        return 0

    @staticmethod
    def get_national_averages(
        db: Session,
        prefecture_code: str | None = None,
        household_size: int | None = None,
        income_quintile: int | None = None,
    ) -> list[NationalAverage]:
        """Get national average spending data with filters.

        Args:
            db: Database session
            prefecture_code: Optional prefecture filter
            household_size: Optional household size filter
            income_quintile: Optional income quintile filter

        Returns:
            List of national averages
        """
        query = db.query(SpendingBenchmark)

        # Apply filters
        if prefecture_code:
            query = query.filter(SpendingBenchmark.prefecture_code == prefecture_code)
        if household_size:
            query = query.filter(SpendingBenchmark.household_size == household_size)
        if income_quintile:
            query = query.filter(SpendingBenchmark.income_quintile == income_quintile)

        benchmarks = query.all()

        return [
            NationalAverage(
                category=b.category,
                subcategory=b.subcategory,
                monthly_amount=b.monthly_amount,
                household_size=b.household_size,
                prefecture_code=b.prefecture_code,
                income_quintile=b.income_quintile,
                source=b.source,
                data_year=b.data_year,
            )
            for b in benchmarks
        ]
