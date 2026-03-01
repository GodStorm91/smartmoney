"""Helper functions for AI budget prompt building and response parsing."""
import json
import logging
from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.category import Category
from ..models.transaction import Transaction
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy

logger = logging.getLogger(__name__)

# Consolidated mapping of AI-invented/legacy names to canonical parent categories.
# Canonical parents: Food, Housing, Transportation, Entertainment, Shopping, Health, Communication, Other
# Shared by budget_prompt_helpers.normalize_category_name and budget_service.normalize_allocation_category
CATEGORY_ALIASES: dict[str, str] = {
    # Food variants
    "dining": "Food", "groceries": "Food",
    "food & dining": "Food", "food & groceries": "Food",
    # Housing variants
    "housing & utilities": "Housing", "rent": "Housing", "utilities": "Housing",
    # Health variants
    "insurance & medical": "Health", "medical": "Health", "healthcare": "Health",
    # Shopping variants
    "personal & discretionary": "Shopping", "personal expenses": "Shopping",
    # Entertainment variants
    "personal & entertainment": "Entertainment", "leisure": "Entertainment",
    # Other variants
    "gifts & transfers": "Other", "miscellaneous": "Other",
    "education": "Other", "tuition": "Other", "school": "Other",
    "baby/education": "Other",
    # Communication variants
    "telecom": "Communication", "phone": "Communication", "internet": "Communication",
    # Transportation variants
    "transit": "Transportation", "transport": "Transportation", "commute": "Transportation",
}


def fetch_category_spending(db: Session, user_id: int) -> dict[str, dict]:
    """Fetch average monthly spending per category for last 3 months."""
    three_months_ago = date.today() - timedelta(days=90)
    rates = ExchangeRateService.get_cached_rates(db)
    rows = (
        db.query(
            Transaction.category,
            Transaction.amount,
            Transaction.currency,
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.is_income == False,
            Transaction.is_transfer == False,
            Transaction.is_adjustment == False,
            Transaction.date >= three_months_ago
        )
        .all()
    )

    # Aggregate per category with currency conversion to JPY
    category_totals: dict[str, dict] = {}
    for row in rows:
        cat = row.category
        if cat not in category_totals:
            category_totals[cat] = {"total": 0, "count": 0}
        category_totals[cat]["total"] += convert_to_jpy(abs(row.amount), row.currency, rates)
        category_totals[cat]["count"] += 1

    category_spending = {}
    for cat, data in category_totals.items():
        avg_monthly = data["total"] / 3
        category_spending[cat] = {
            "average_monthly": int(avg_monthly),
            "transaction_count": data["count"]
        }
    return category_spending


def fetch_valid_categories(db: Session, user_id: int) -> list[str]:
    """Fetch valid parent category names (system + user custom) for budget allocation."""
    parents = db.query(Category.name).filter(
        Category.parent_id == None,
        Category.type == "expense",
        (Category.is_system == True) | (Category.user_id == user_id)
    ).all()
    return [row.name for row in parents]


def normalize_category_name(name: str, valid_categories: list[str]) -> str:
    """Fuzzy-match an AI-generated category name to a valid parent category.

    Tries: exact match, case-insensitive match, alias lookup,
    substring match (split on & and check each part).
    Falls back to 'Other' if no match found.
    """
    # Exact match
    if name in valid_categories:
        return name

    # Case-insensitive match
    lower_map = {v.lower(): v for v in valid_categories}
    if name.lower() in lower_map:
        return lower_map[name.lower()]

    # Alias lookup
    alias_match = CATEGORY_ALIASES.get(name.lower())
    if alias_match and alias_match in valid_categories:
        return alias_match

    # Substring match: split on & or , and check each part
    parts = [p.strip().lower() for p in name.replace("&", ",").split(",")]
    for part in parts:
        if part in lower_map:
            return lower_map[part]
        # Check if part is a substring of any valid category
        for valid_lower, valid_name in lower_map.items():
            if part in valid_lower or valid_lower in part:
                return valid_name

    logger.warning("Could not match category '%s' to valid list %s, defaulting to 'Other'", name, valid_categories)
    return "Other" if "Other" in valid_categories else valid_categories[0] if valid_categories else name


def build_budget_prompt(
    monthly_income: int,
    category_spending: dict[str, dict],
    valid_categories: list[str],
    feedback: str | None = None,
    language: str = "ja"
) -> str:
    """Build prompt for Claude AI budget generation."""
    language_map = {"ja": "Japanese", "en": "English", "vi": "Vietnamese"}
    language_name = language_map.get(language, "English")

    income_display = f"\u00a5{monthly_income:,}"

    spending_str = "\n".join([
        f"  - {cat}: \u00a5{data['average_monthly']:,} (avg/month, {data['transaction_count']} transactions)"
        for cat, data in category_spending.items()
    ])

    categories_str = ", ".join(valid_categories)

    prompt = f"""IMPORTANT: Respond in {language_name}. For "category" field, use ONLY these exact names: {categories_str}. Do NOT invent new names.

You are a personal finance advisor creating a monthly budget.

INCOME: {income_display}/month
VALID CATEGORIES: {categories_str}

HISTORICAL SPENDING (last 3 months average):
{spending_str if spending_str else "  No historical data available"}
{'USER FEEDBACK: ' + feedback if feedback else ''}

TASK: Create a balanced monthly budget that:
1. Allocates funds across relevant expense categories
2. Recommends savings target (20-30% of income if possible)
3. Considers historical spending patterns
4. Follows the 50/30/20 rule (needs/wants/savings) as guideline
5. Provides 1-2 sentences of practical advice

OUTPUT FORMAT (JSON):
{{
  "allocations": [
    {{"category": "Housing", "amount": 50000, "reasoning": "Based on historical spending"}},
    {{"category": "Food", "amount": 30000, "reasoning": "Reduced from historical average"}}
  ],
  "savings_target": 20000,
  "advice": "Your advice here"
}}

RULES:
- Use Japanese Yen, all amounts as integers
- Total allocations + savings must not exceed income
- 5-10 categories max, MUST be from the valid list above
- Brief reasoning for each allocation

Generate the budget now:"""

    return prompt


def parse_budget_response(
    response_text: str,
    valid_categories: list[str] | None = None
) -> dict[str, Any]:
    """Parse Claude's budget response and validate category names."""
    start_idx = response_text.find("{")
    end_idx = response_text.rfind("}") + 1

    if start_idx == -1 or end_idx == 0:
        raise ValueError("No valid JSON found in Claude response")

    json_str = response_text[start_idx:end_idx]
    budget_data = json.loads(json_str)

    if "allocations" not in budget_data or not isinstance(budget_data["allocations"], list):
        raise ValueError("Invalid budget format: missing allocations array")

    for alloc in budget_data["allocations"]:
        if "category" not in alloc or "amount" not in alloc:
            raise ValueError("Invalid allocation format: missing category or amount")

    # Post-validate and normalize category names
    if valid_categories:
        for alloc in budget_data["allocations"]:
            original = alloc["category"]
            normalized = normalize_category_name(original, valid_categories)
            if original != normalized:
                logger.info("Normalized budget category '%s' -> '%s'", original, normalized)
                alloc["category"] = normalized

    return budget_data
