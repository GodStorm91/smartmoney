"""Rule-based financial advice for relocation comparison."""

from ..schemas.relocation import CityBreakdown
from .constants import OSAKA_PREFECTURE_CODE, TOKYO_PREFECTURE_CODE


def _fmt(amount: int) -> str:
    """Format an integer as a yen string with thousands separators."""
    return f"\u00a5{abs(amount):,}"


def generate_advice(
    current: CityBreakdown,
    target: CityBreakdown,
    nenshu: int,
    has_young_children: bool,
    monthly_diff: int,
    annual_diff: int,
) -> list[str]:
    """Generate 3-5 relevant financial advice tips based on comparison data.

    Args:
        current: Monthly breakdown for the current city.
        target: Monthly breakdown for the target city.
        nenshu: Annual gross income in JPY.
        has_young_children: Whether the household has children aged 0-2.
        monthly_diff: target.total_monthly - current.total_monthly.
        annual_diff: monthly_diff * 12.

    Returns:
        List of 3-5 advice strings, most relevant first.
    """
    tips: list[tuple[int, str]] = []  # (priority, message)

    # Rule 1 - Savings magnitude
    if annual_diff < -300_000:
        tips.append((
            10,
            f"Moving to {target.city_name} could save you {_fmt(annual_diff)} per year. "
            f"That's {_fmt(monthly_diff)} less each month.",
        ))
    elif annual_diff > 300_000:
        tips.append((
            10,
            f"Living in {target.city_name} would cost {_fmt(annual_diff)} more per year. "
            f"Make sure your budget can absorb the increase.",
        ))

    # Rule 2 - Rent is primary driver
    rent_diff = target.rent - current.rent
    total_diff_abs = abs(monthly_diff) if monthly_diff != 0 else 1
    if abs(rent_diff) > 0 and (abs(rent_diff) / total_diff_abs) > 0.60:
        direction = "lower" if rent_diff < 0 else "higher"
        tips.append((
            9,
            f"Rent is the primary factor: {target.city_name} averages {_fmt(rent_diff)}/month "
            f"{direction} than {current.city_name}. Consider negotiating or adjusting room size.",
        ))

    # Rule 3 - Childcare impact for Tokyo/Osaka
    _FREE_CITIES = {TOKYO_PREFECTURE_CODE, OSAKA_PREFECTURE_CODE}
    if has_young_children:
        cur_childcare = current.estimated_childcare
        tgt_childcare = target.estimated_childcare
        if cur_childcare > 0 and tgt_childcare == 0:
            tips.append((
                8,
                f"{target.prefecture_name} offers free childcare for ages 0-2, "
                f"saving you {_fmt(cur_childcare)}/month compared to {current.city_name}.",
            ))
        elif cur_childcare == 0 and tgt_childcare > 0:
            tips.append((
                8,
                f"Moving away from {current.prefecture_name} means losing free childcare for ages 0-2. "
                f"Expect to pay around {_fmt(tgt_childcare)}/month for nursery.",
            ))

    # Rule 4 - NISA opportunity
    if annual_diff < 0:
        annual_savings = abs(annual_diff)
        if annual_savings > 360_000:
            tips.append((
                7,
                f"Your annual savings of {_fmt(annual_savings)} exceed the tsumitate NISA limit "
                f"({_fmt(360_000)}/year). Consider investing the surplus for long-term growth.",
            ))
        elif annual_savings > 120_000:
            tips.append((
                6,
                f"You could channel your {_fmt(annual_savings)}/year savings into a tsumitate NISA "
                f"to grow your wealth tax-free.",
            ))

    # Rule 5 - Rent-to-income ratio warning
    monthly_income = nenshu // 12
    if monthly_income > 0:
        ratio = target.rent / monthly_income
        if ratio > 0.30:
            tips.append((
                9,
                f"Rent in {target.city_name} would consume {ratio:.0%} of your gross monthly income. "
                f"Financial advisors recommend keeping rent below 25-30%.",
            ))
        elif ratio > 0.25:
            tips.append((
                5,
                f"Rent in {target.city_name} is {ratio:.0%} of your gross monthly income, "
                f"which is at the upper end of the recommended 25% guideline.",
            ))

    # Rule 6 - Tax/insurance difference negligible
    cur_tax_ins = current.social_insurance + current.resident_tax + current.income_tax
    tgt_tax_ins = target.social_insurance + target.resident_tax + target.income_tax
    tax_ins_diff = abs(tgt_tax_ins - cur_tax_ins)
    if tax_ins_diff < 20_000:
        tips.append((
            3,
            "Tax and social insurance costs are nearly identical between the two cities, "
            "so the cost difference is driven mainly by living expenses.",
        ))

    # Sort by priority descending, take top 5
    tips.sort(key=lambda t: t[0], reverse=True)
    result = [msg for _, msg in tips[:5]]

    # Ensure at least 3 tips by adding generic fallbacks
    fallbacks = [
        "Compare actual apartment listings on suumo.jp or homes.co.jp for a more precise rent estimate.",
        "Visit both cities before deciding; local atmosphere and commute times matter as much as cost.",
        "Factor in one-time moving costs (deposit, key money, shipping) which are not included in this estimate.",
    ]
    for fb in fallbacks:
        if len(result) >= 3:
            break
        result.append(fb)

    return result[:5]
