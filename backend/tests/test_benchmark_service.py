"""Tests for benchmark service."""

import pytest
from datetime import date, timedelta
from sqlalchemy.orm import Session

from app.models.benchmark import SpendingBenchmark
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.benchmark import HouseholdProfile
from app.services.benchmark_service import BenchmarkService


@pytest.fixture
def test_user(db_session: Session):
    """Create test user."""
    user = User(
        email="benchmark@test.com",
        hashed_password="hashedpw",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def benchmark_data(db_session: Session):
    """Create test benchmark data."""
    benchmarks = [
        # National averages
        SpendingBenchmark(
            source="家計調査",
            data_year=2024,
            category="食料",
            monthly_amount=80000,
            sample_count=8500,
        ),
        SpendingBenchmark(
            source="家計調査",
            data_year=2024,
            category="住居",
            monthly_amount=18000,
            sample_count=8500,
        ),
        SpendingBenchmark(
            source="家計調査",
            data_year=2024,
            category="教育",
            monthly_amount=15000,
            sample_count=8500,
        ),
        # Prefecture-specific (Tokyo)
        SpendingBenchmark(
            source="家計調査",
            data_year=2024,
            prefecture_code="13",
            category="食料",
            monthly_amount=85000,
            sample_count=1200,
        ),
        SpendingBenchmark(
            source="家計調査",
            data_year=2024,
            prefecture_code="13",
            category="住居",
            monthly_amount=32000,
            sample_count=1200,
        ),
        # Shopping categories (sum test)
        SpendingBenchmark(
            source="家計調査",
            data_year=2024,
            category="被服",
            monthly_amount=10000,
            sample_count=8500,
        ),
        SpendingBenchmark(
            source="家計調査",
            data_year=2024,
            category="家具・家事用品",
            monthly_amount=12000,
            sample_count=8500,
        ),
    ]
    for b in benchmarks:
        db_session.add(b)
    db_session.commit()
    return benchmarks


@pytest.fixture
def user_transactions(db_session: Session, test_user: User):
    """Create test transactions for user."""
    three_months_ago = date.today() - timedelta(days=90)
    transactions = [
        # Food spending (3 months total: 240000, avg: 80000/month)
        Transaction(
            user_id=test_user.id,
            description="Grocery 1",
            amount=-80000,
            category="Food",
            date=three_months_ago + timedelta(days=10),
            is_income=False,
            is_transfer=False,
            currency="JPY",
            source="test",
            month_key=(three_months_ago + timedelta(days=10)).strftime("%Y-%m"),
            tx_hash="test_grocery_1",
        ),
        Transaction(
            user_id=test_user.id,
            description="Grocery 2",
            amount=-80000,
            category="Food",
            date=three_months_ago + timedelta(days=40),
            is_income=False,
            is_transfer=False,
            currency="JPY",
            source="test",
            month_key=(three_months_ago + timedelta(days=40)).strftime("%Y-%m"),
            tx_hash="test_grocery_2",
        ),
        Transaction(
            user_id=test_user.id,
            description="Grocery 3",
            amount=-80000,
            category="Food",
            date=three_months_ago + timedelta(days=70),
            is_income=False,
            is_transfer=False,
            currency="JPY",
            source="test",
            month_key=(three_months_ago + timedelta(days=70)).strftime("%Y-%m"),
            tx_hash="test_grocery_3",
        ),
        # Housing spending (3 months total: 120000, avg: 40000/month)
        Transaction(
            user_id=test_user.id,
            description="Rent 1",
            amount=-40000,
            category="Housing",
            date=three_months_ago + timedelta(days=10),
            is_income=False,
            is_transfer=False,
            currency="JPY",
            source="test",
            month_key=(three_months_ago + timedelta(days=10)).strftime("%Y-%m"),
            tx_hash="test_rent_1",
        ),
        Transaction(
            user_id=test_user.id,
            description="Rent 2",
            amount=-40000,
            category="Housing",
            date=three_months_ago + timedelta(days=40),
            is_income=False,
            is_transfer=False,
            currency="JPY",
            source="test",
            month_key=(three_months_ago + timedelta(days=40)).strftime("%Y-%m"),
            tx_hash="test_rent_2",
        ),
        Transaction(
            user_id=test_user.id,
            description="Rent 3",
            amount=-40000,
            category="Housing",
            date=three_months_ago + timedelta(days=70),
            is_income=False,
            is_transfer=False,
            currency="JPY",
            source="test",
            month_key=(three_months_ago + timedelta(days=70)).strftime("%Y-%m"),
            tx_hash="test_rent_3",
        ),
    ]
    for tx in transactions:
        db_session.add(tx)
    db_session.commit()
    return transactions


def test_household_profile_crud(db_session: Session, test_user: User):
    """Test household profile CRUD operations."""
    # Initially no profile
    profile = BenchmarkService.get_household_profile(db_session, test_user.id)
    assert profile is None

    # Create profile
    new_profile = HouseholdProfile(
        household_size=3, prefecture_code="13", income_quintile=3
    )
    updated = BenchmarkService.update_household_profile(db_session, test_user.id, new_profile)
    assert updated.household_size == 3
    assert updated.prefecture_code == "13"
    assert updated.income_quintile == 3

    # Retrieve profile
    retrieved = BenchmarkService.get_household_profile(db_session, test_user.id)
    assert retrieved is not None
    assert retrieved.household_size == 3
    assert retrieved.prefecture_code == "13"
    assert retrieved.income_quintile == 3

    # Update profile
    updated_profile = HouseholdProfile(
        household_size=4, prefecture_code="27", income_quintile=4
    )
    result = BenchmarkService.update_household_profile(db_session, test_user.id, updated_profile)
    assert result.household_size == 4
    assert result.prefecture_code == "27"
    assert result.income_quintile == 4


def test_get_user_spending_last_3_months(db_session: Session, test_user: User, user_transactions):
    """Test user spending aggregation."""
    spending = BenchmarkService.get_user_spending_last_3_months(db_session, test_user.id)

    # Food: 240000 / 3 = 80000
    assert spending.get("Food") == 80000

    # Housing: 120000 / 3 = 40000
    assert spending.get("Housing") == 40000


def test_comparison_without_profile(db_session: Session, test_user: User):
    """Test comparison fails without household profile."""
    with pytest.raises(ValueError, match="Household profile not set"):
        BenchmarkService.get_comparison(db_session, test_user.id)


def test_comparison_with_national_average(
    db_session: Session, test_user: User, user_transactions, benchmark_data
):
    """Test comparison using national average fallback."""
    # Set household profile
    profile = HouseholdProfile(
        household_size=3, prefecture_code="99", income_quintile=3  # Non-existent prefecture
    )
    BenchmarkService.update_household_profile(db_session, test_user.id, profile)

    # Get comparison
    comparison = BenchmarkService.get_comparison(db_session, test_user.id)

    assert comparison.user_profile.household_size == 3
    assert comparison.total_user_spending == 120000  # 80000 + 40000

    # Check Food comparison
    food_comp = next(c for c in comparison.comparisons if c.category == "Food")
    assert food_comp.user_amount == 80000
    assert food_comp.benchmark_amount == 80000  # National average
    assert food_comp.difference_pct == 0.0
    assert food_comp.status == "neutral"

    # Check Housing comparison
    housing_comp = next(c for c in comparison.comparisons if c.category == "Housing")
    assert housing_comp.user_amount == 40000
    assert housing_comp.benchmark_amount == 18000  # National average
    # (40000 - 18000) / 18000 * 100 = 122.2%
    assert housing_comp.difference_pct > 100
    assert housing_comp.status == "over"


def test_comparison_with_prefecture_data(
    db_session: Session, test_user: User, user_transactions, benchmark_data
):
    """Test comparison using prefecture-specific data."""
    # Set Tokyo profile
    profile = HouseholdProfile(household_size=3, prefecture_code="13", income_quintile=3)
    BenchmarkService.update_household_profile(db_session, test_user.id, profile)

    # Get comparison
    comparison = BenchmarkService.get_comparison(db_session, test_user.id)

    # Check Food uses Tokyo benchmark
    food_comp = next(c for c in comparison.comparisons if c.category == "Food")
    assert food_comp.benchmark_amount == 85000  # Tokyo average, not national

    # Check Housing uses Tokyo benchmark
    housing_comp = next(c for c in comparison.comparisons if c.category == "Housing")
    assert housing_comp.benchmark_amount == 32000  # Tokyo average


def test_category_mapping_shopping(db_session: Session, benchmark_data):
    """Test Shopping category maps to sum of 被服 + 家具・家事用品."""
    amount = BenchmarkService._get_benchmark_for_category(benchmark_data, "Shopping")
    # Should be 10000 (被服) + 12000 (家具・家事用品) = 22000
    assert amount == 22000


def test_get_national_averages(db_session: Session, benchmark_data):
    """Test national averages endpoint with filters."""
    # All averages
    all_averages = BenchmarkService.get_national_averages(db_session)
    assert len(all_averages) == 7

    # Filter by prefecture
    tokyo_averages = BenchmarkService.get_national_averages(db_session, prefecture_code="13")
    assert len(tokyo_averages) == 2
    assert all(avg.prefecture_code == "13" for avg in tokyo_averages)

    # National only (no prefecture)
    national_only = BenchmarkService.get_national_averages(db_session, prefecture_code=None)
    # Some have prefecture_code=None, some have prefecture_code="13"
    # So we need to count those with None
    national_count = sum(1 for avg in all_averages if avg.prefecture_code is None)
    assert len([a for a in all_averages if a.prefecture_code is None]) == national_count


def test_fallback_hierarchy(db_session: Session, test_user: User, benchmark_data):
    """Test fallback hierarchy: full match → prefecture → national."""
    profile = HouseholdProfile(household_size=3, prefecture_code="13", income_quintile=3)

    # Try full match (should fail, no quintile/size specific data)
    benchmarks = BenchmarkService._get_benchmarks_with_fallback(db_session, profile)
    # Should fall back to prefecture only (Tokyo)
    assert len(benchmarks) == 2
    assert all(b.prefecture_code == "13" for b in benchmarks)

    # Try non-existent prefecture (should use national)
    profile2 = HouseholdProfile(household_size=3, prefecture_code="99", income_quintile=3)
    benchmarks2 = BenchmarkService._get_benchmarks_with_fallback(db_session, profile2)
    assert all(b.prefecture_code is None for b in benchmarks2)


def test_education_category_in_comparison(db_session: Session, test_user: User, benchmark_data):
    """Test Education category is included in comparison."""
    # Add education transaction
    three_months_ago = date.today() - timedelta(days=90)
    edu_tx = Transaction(
        user_id=test_user.id,
        description="School tuition",
        amount=-45000,  # 45000 * 3 months = 135000 total, 45000 avg
        category="Education",
        date=three_months_ago + timedelta(days=10),
        is_income=False,
        is_transfer=False,
        currency="JPY",
        source="test",
        month_key=(three_months_ago + timedelta(days=10)).strftime("%Y-%m"),
        tx_hash="test_education_1",
    )
    db_session.add(edu_tx)
    db_session.commit()

    # Set profile
    profile = HouseholdProfile(household_size=3, prefecture_code="01", income_quintile=3)
    BenchmarkService.update_household_profile(db_session, test_user.id, profile)

    # Get comparison
    comparison = BenchmarkService.get_comparison(db_session, test_user.id)

    # Check Education is included
    edu_comp = next((c for c in comparison.comparisons if c.category == "Education"), None)
    assert edu_comp is not None
    assert edu_comp.user_amount == 15000  # 45000 / 3 months
    assert edu_comp.benchmark_amount == 15000  # National average
