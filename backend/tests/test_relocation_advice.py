"""Tests for rule-based financial advice generation."""
import pytest

from app.schemas.relocation import CityBreakdown
from app.utils.relocation_advice import generate_advice


def _make_breakdown(**overrides) -> CityBreakdown:
    """Build a CityBreakdown with sensible defaults, applying overrides."""
    defaults = dict(
        city_name="TestCity",
        prefecture_name="TestPref",
        rent=60_000,
        estimated_food=40_000,
        estimated_utilities=12_000,
        estimated_transport=10_000,
        social_insurance=20_000,
        resident_tax=15_000,
        income_tax=10_000,
        estimated_childcare=0,
        total_monthly=167_000,
    )
    defaults.update(overrides)
    return CityBreakdown(**defaults)


class TestAdviceGeneration:
    """Tests for generate_advice function."""

    def test_returns_between_3_and_5_tips(self):
        cur = _make_breakdown(city_name="CityA")
        tgt = _make_breakdown(city_name="CityB")
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False, monthly_diff=0, annual_diff=0)
        assert 3 <= len(tips) <= 5

    def test_large_savings_nisa_suggestion(self):
        """Annual savings > 360k should trigger NISA advice."""
        cur = _make_breakdown(city_name="Expensive", total_monthly=250_000)
        tgt = _make_breakdown(city_name="Cheap", total_monthly=200_000)
        monthly_diff = -50_000
        annual_diff = -600_000
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False,
                               monthly_diff=monthly_diff, annual_diff=annual_diff)
        nisa_tips = [t for t in tips if "NISA" in t]
        assert len(nisa_tips) >= 1

    def test_moderate_savings_nisa_suggestion(self):
        """Annual savings 120k-360k should suggest tsumitate NISA."""
        cur = _make_breakdown(city_name="CityA", total_monthly=180_000)
        tgt = _make_breakdown(city_name="CityB", total_monthly=160_000)
        monthly_diff = -20_000
        annual_diff = -240_000
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False,
                               monthly_diff=monthly_diff, annual_diff=annual_diff)
        nisa_tips = [t for t in tips if "NISA" in t]
        assert len(nisa_tips) >= 1

    def test_no_nisa_when_costs_increase(self):
        """No NISA advice when moving to a more expensive city."""
        cur = _make_breakdown(city_name="CityA", total_monthly=160_000)
        tgt = _make_breakdown(city_name="CityB", total_monthly=200_000)
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False,
                               monthly_diff=40_000, annual_diff=480_000)
        nisa_tips = [t for t in tips if "NISA" in t]
        assert len(nisa_tips) == 0

    def test_high_rent_ratio_warning(self):
        """Rent > 30% of monthly income should trigger warning."""
        monthly_income = 5_000_000 // 12  # ~416k
        high_rent = int(monthly_income * 0.35)  # ~145k
        cur = _make_breakdown(city_name="CityA", rent=60_000)
        tgt = _make_breakdown(city_name="CityB", rent=high_rent,
                              total_monthly=high_rent + 100_000)
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False,
                               monthly_diff=high_rent - 60_000,
                               annual_diff=(high_rent - 60_000) * 12)
        rent_warnings = [t for t in tips if "30%" in t or "25%" in t or "rent" in t.lower()]
        assert len(rent_warnings) >= 1

    def test_moderate_rent_ratio_note(self):
        """Rent 25-30% of monthly income should get a note."""
        monthly_income = 5_000_000 // 12  # ~416k
        moderate_rent = int(monthly_income * 0.27)  # ~112k
        cur = _make_breakdown(city_name="CityA", rent=60_000)
        tgt = _make_breakdown(city_name="CityB", rent=moderate_rent,
                              total_monthly=moderate_rent + 100_000)
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False,
                               monthly_diff=moderate_rent - 60_000,
                               annual_diff=(moderate_rent - 60_000) * 12)
        rent_tips = [t for t in tips if "25%" in t or "rent" in t.lower()]
        assert len(rent_tips) >= 1

    def test_childcare_advantage_moving_to_free(self):
        """Moving from paid to free childcare city should mention savings."""
        cur = _make_breakdown(city_name="OtherCity", prefecture_name="福岡県",
                              estimated_childcare=38_000, total_monthly=200_000)
        tgt = _make_breakdown(city_name="TokyoWard", prefecture_name="東京都",
                              estimated_childcare=0, total_monthly=180_000)
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=True,
                               monthly_diff=-20_000, annual_diff=-240_000)
        childcare_tips = [t for t in tips if "childcare" in t.lower() or "0-2" in t]
        assert len(childcare_tips) >= 1

    def test_childcare_loss_moving_from_free(self):
        """Moving from free childcare to paid should warn about cost."""
        cur = _make_breakdown(city_name="TokyoWard", prefecture_name="東京都",
                              estimated_childcare=0, total_monthly=180_000)
        tgt = _make_breakdown(city_name="OtherCity", prefecture_name="福岡県",
                              estimated_childcare=38_000, total_monthly=200_000)
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=True,
                               monthly_diff=20_000, annual_diff=240_000)
        childcare_tips = [t for t in tips if "childcare" in t.lower() or "nursery" in t.lower()]
        assert len(childcare_tips) >= 1

    def test_rent_is_primary_driver(self):
        """When rent accounts for >60% of difference, mention it."""
        cur = _make_breakdown(city_name="CityA", rent=100_000, total_monthly=200_000)
        tgt = _make_breakdown(city_name="CityB", rent=50_000, total_monthly=155_000)
        monthly_diff = -45_000  # rent diff is -50k out of -45k total
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False,
                               monthly_diff=monthly_diff, annual_diff=monthly_diff * 12)
        rent_tips = [t for t in tips if "rent" in t.lower() and "primary" in t.lower()]
        assert len(rent_tips) >= 1

    def test_tax_difference_negligible(self):
        """Small tax/insurance diff should note it's driven by living expenses."""
        cur = _make_breakdown(social_insurance=20_000, resident_tax=15_000, income_tax=10_000)
        tgt = _make_breakdown(social_insurance=20_500, resident_tax=15_000, income_tax=10_000)
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False, monthly_diff=0, annual_diff=0)
        tax_tips = [t for t in tips if "tax" in t.lower() and "identical" in t.lower()]
        assert len(tax_tips) >= 1

    def test_fallback_tips_when_few_rules_match(self):
        """When fewer than 3 rules match, fallbacks fill to minimum 3."""
        cur = _make_breakdown(city_name="Same", total_monthly=100_000,
                              rent=30_000, social_insurance=20_000,
                              resident_tax=15_000, income_tax=10_000)
        tgt = _make_breakdown(city_name="Same2", total_monthly=100_000,
                              rent=30_000, social_insurance=20_000,
                              resident_tax=15_000, income_tax=10_000)
        tips = generate_advice(cur, tgt, nenshu=5_000_000,
                               has_young_children=False, monthly_diff=0, annual_diff=0)
        assert len(tips) >= 3

    def test_never_more_than_5_tips(self):
        """Even with many rules matching, cap at 5."""
        cur = _make_breakdown(city_name="Expensive", rent=200_000,
                              estimated_childcare=38_000, total_monthly=400_000,
                              social_insurance=20_000, resident_tax=15_000,
                              income_tax=10_000)
        tgt = _make_breakdown(city_name="Cheap", rent=50_000,
                              estimated_childcare=0, total_monthly=200_000,
                              social_insurance=20_500, resident_tax=15_000,
                              income_tax=10_000)
        tips = generate_advice(cur, tgt, nenshu=3_000_000,
                               has_young_children=True,
                               monthly_diff=-200_000, annual_diff=-2_400_000)
        assert len(tips) <= 5
