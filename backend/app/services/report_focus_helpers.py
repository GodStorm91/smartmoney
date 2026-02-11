"""Focus area ranking and suggestion helpers for monthly reports."""
from ..schemas.report import BudgetCategoryStatus, FocusAreaItem

# Status severity order for ranking (highest first)
_STATUS_SEVERITY = {
    "over_budget": 0,
    "threshold_80": 1,
    "threshold_50": 2,
    "normal": 3,
}

_SUGGESTION_KEYS = {
    "over_budget": "report.focusSuggestionOverBudget",
    "threshold_80": "report.focusSuggestionThreshold80",
    "threshold_50": "report.focusSuggestionOnTrack",
    "normal": "report.focusSuggestionUnderBudget",
}

MAX_FOCUS_AREAS = 3


def build_focus_areas(
    category_items: list[BudgetCategoryStatus],
) -> list[FocusAreaItem]:
    """Build top-N focus area items sorted by status severity.

    Args:
        category_items: Budget category status list with spending data.

    Returns:
        Up to MAX_FOCUS_AREAS items, worst-status first.
    """
    sorted_items = sorted(
        category_items,
        key=lambda c: (_STATUS_SEVERITY.get(c.status, 99), -c.percentage),
    )

    focus: list[FocusAreaItem] = []
    for cs in sorted_items[:MAX_FOCUS_AREAS]:
        over_under = cs.spent - cs.budget_amount
        remaining = cs.budget_amount - cs.spent
        params = {
            "category": cs.category,
            "amount": abs(over_under),
            "pct": round(cs.percentage, 1),
            "remaining": max(remaining, 0),
        }
        focus.append(FocusAreaItem(
            category=cs.category,
            status=cs.status,
            budget_amount=cs.budget_amount,
            spent=cs.spent,
            amount_over_under=over_under,
            percentage=cs.percentage,
            spending_change=cs.spending_change,
            suggestion_key=_SUGGESTION_KEYS.get(
                cs.status, "report.focusSuggestionUnderBudget"
            ),
            suggestion_params=params,
        ))
    return focus


def prev_month_key(month_key: str) -> str:
    """Compute previous month key from YYYY-MM string.

    Args:
        month_key: Current month in YYYY-MM format.

    Returns:
        Previous month in YYYY-MM format.
    """
    year, month = map(int, month_key.split("-"))
    if month == 1:
        return f"{year - 1}-12"
    return f"{year}-{month - 1:02d}"
