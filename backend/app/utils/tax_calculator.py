"""Japanese tax calculation utilities (2024 brackets).

All functions accept annual JPY integers and return annual JPY integers.
"""


def calculate_employment_deduction(nenshu: int) -> int:
    """Calculate employment income deduction (給与所得控除).

    Args:
        nenshu: Annual gross salary in JPY.

    Returns:
        Deduction amount in JPY.
    """
    if nenshu <= 1_625_000:
        return 550_000
    if nenshu <= 1_800_000:
        return int(nenshu * 0.4 - 100_000)
    if nenshu <= 3_600_000:
        return int(nenshu * 0.3 + 80_000)
    if nenshu <= 6_600_000:
        return int(nenshu * 0.2 + 440_000)
    if nenshu <= 8_500_000:
        return int(nenshu * 0.1 + 1_100_000)
    return 1_950_000


def _taxable_income(nenshu: int, num_dependents: int) -> int:
    """Derive taxable income after all deductions.

    Args:
        nenshu: Annual gross salary in JPY.
        num_dependents: Number of dependents.

    Returns:
        Taxable income (floored to 0).
    """
    employment = calculate_employment_deduction(nenshu)
    basic = 480_000
    dependent = 380_000 * num_dependents
    return max(0, nenshu - employment - basic - dependent)


def calculate_income_tax(nenshu: int, num_dependents: int) -> int:
    """Calculate national income tax (所得税) using progressive brackets.

    Args:
        nenshu: Annual gross salary in JPY.
        num_dependents: Number of dependents.

    Returns:
        Annual income tax in JPY.
    """
    taxable = _taxable_income(nenshu, num_dependents)
    if taxable <= 0:
        return 0

    brackets = [
        (1_950_000, 0.05, 0),
        (3_300_000, 0.10, 97_500),
        (6_950_000, 0.20, 427_500),
        (9_000_000, 0.23, 636_000),
        (18_000_000, 0.33, 1_536_000),
        (40_000_000, 0.40, 2_796_000),
    ]
    for limit, rate, deduction in brackets:
        if taxable <= limit:
            return max(0, int(taxable * rate - deduction))

    return max(0, int(taxable * 0.45 - 4_796_000))


def calculate_resident_tax(nenshu: int, num_dependents: int) -> int:
    """Calculate resident tax (住民税) — 10% of taxable income + ¥5,000.

    Args:
        nenshu: Annual gross salary in JPY.
        num_dependents: Number of dependents.

    Returns:
        Annual resident tax in JPY.
    """
    taxable = _taxable_income(nenshu, num_dependents)
    if taxable <= 0:
        return 0
    return int(taxable * 0.10) + 5_000


def calculate_social_insurance(nenshu: int, rate: float) -> int:
    """Calculate employee social insurance contribution.

    Args:
        nenshu: Annual gross salary in JPY.
        rate: Prefecture insurance rate as decimal (e.g. 0.0998).

    Returns:
        Annual employee portion in JPY.
    """
    return int(nenshu * rate / 2)
