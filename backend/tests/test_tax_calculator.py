"""Tests for Japanese tax calculation utilities."""
import pytest

from app.utils.tax_calculator import (
    calculate_employment_deduction,
    calculate_income_tax,
    calculate_resident_tax,
    calculate_social_insurance,
)


class TestEmploymentDeduction:
    """Tests for employment income deduction brackets."""

    @pytest.mark.parametrize("nenshu,expected", [
        (1_000_000, 550_000),          # lowest bracket
        (1_625_000, 550_000),          # boundary
        (1_700_000, 580_000),          # 40% - 100k
        (1_800_000, 620_000),          # boundary
        (3_000_000, 980_000),          # 30% + 80k
        (3_600_000, 1_160_000),        # boundary
        (5_000_000, 1_440_000),        # 20% + 440k
        (6_600_000, 1_760_000),        # boundary
        (8_000_000, 1_900_000),        # 10% + 1.1M
        (8_500_000, 1_950_000),        # boundary
        (10_000_000, 1_950_000),       # cap
        (50_000_000, 1_950_000),       # well above cap
    ])
    def test_brackets(self, nenshu: int, expected: int):
        assert calculate_employment_deduction(nenshu) == expected

    def test_zero_income(self):
        assert calculate_employment_deduction(0) == 550_000


class TestIncomeTax:
    """Tests for national income tax calculation."""

    def test_low_income_no_tax(self):
        """Income below deductions should yield zero tax."""
        assert calculate_income_tax(1_000_000, 0) == 0

    @pytest.mark.parametrize("nenshu,dependents,expected", [
        # 3M: taxable = 3M - 980k - 480k = 1,540,000 -> 5% = 77,000
        (3_000_000, 0, 77_000),
        # 5M: taxable = 5M - 1.44M - 480k = 3,080,000 -> 10% - 97,500 = 210,500
        (5_000_000, 0, 210_500),
        # 8M: taxable = 8M - 1.9M - 480k = 5,620,000 -> 20% - 427,500 = 696,500
        (8_000_000, 0, 696_500),
        # 10M: taxable = 10M - 1.95M - 480k = 7,570,000 -> 23% - 636,000 = 1,105,100
        (10_000_000, 0, 1_105_100),
    ])
    def test_bracket_values(self, nenshu: int, dependents: int, expected: int):
        assert calculate_income_tax(nenshu, dependents) == expected

    def test_dependents_reduce_tax(self):
        """More dependents -> lower taxable income -> lower tax."""
        base = calculate_income_tax(5_000_000, 0)
        with_1 = calculate_income_tax(5_000_000, 1)
        with_2 = calculate_income_tax(5_000_000, 2)
        assert base > with_1 > with_2

    def test_three_dependents(self):
        """3 dependents: taxable = 5M - 1.44M - 480k - 1.14M = 1,940,000 -> 5%."""
        result = calculate_income_tax(5_000_000, 3)
        assert result == 97_000  # 1,940,000 * 0.05

    def test_high_income_top_bracket(self):
        """50M nenshu should hit the 45% bracket."""
        result = calculate_income_tax(50_000_000, 0)
        # taxable = 50M - 1.95M - 480k = 47,570,000
        # 45% * 47,570,000 - 4,796,000 = 16,610,500
        assert result == 16_610_500


class TestResidentTax:
    """Tests for resident tax calculation."""

    def test_standard_case(self):
        """5M nenshu, 0 dep: taxable 3,080,000 -> 10% + 5k = 313,000."""
        assert calculate_resident_tax(5_000_000, 0) == 313_000

    def test_low_income_zero(self):
        assert calculate_resident_tax(1_000_000, 0) == 0

    def test_with_dependents(self):
        base = calculate_resident_tax(5_000_000, 0)
        with_dep = calculate_resident_tax(5_000_000, 2)
        assert with_dep < base


class TestSocialInsurance:
    """Tests for social insurance calculation."""

    def test_employee_portion(self):
        """5M at 9.98% -> employee half = 249,500."""
        assert calculate_social_insurance(5_000_000, 0.0998) == 249_500

    def test_different_rate(self):
        """8M at 10.0% -> employee half = 400,000."""
        assert calculate_social_insurance(8_000_000, 0.10) == 400_000

    def test_zero_income(self):
        assert calculate_social_insurance(0, 0.10) == 0
