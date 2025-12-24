"""Claude AI service for budget generation."""
import json
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from anthropic import Anthropic
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..config import settings
from ..models.transaction import Transaction


class ClaudeAIService:
    """Service for Claude AI integration."""

    def __init__(self):
        """Initialize Claude AI client."""
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-haiku-20241022"

    def _get_spending_summary(
        self,
        db: Session,
        user_id: int,
        days: int
    ) -> dict[str, dict]:
        """Get aggregated spending by category for given time period.

        Args:
            db: Database session
            user_id: User ID
            days: Number of days to look back

        Returns:
            Dict mapping category to {average_monthly, transaction_count}
        """
        cutoff_date = date.today() - timedelta(days=days)
        months = Decimal(days) / Decimal(30)  # Approximate months for averaging

        spending_data = (
            db.query(
                Transaction.category,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count")
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_income == False,
                Transaction.is_transfer == False,
                Transaction.is_adjustment == False,
                Transaction.date >= cutoff_date
            )
            .group_by(Transaction.category)
            .all()
        )

        category_spending = {}
        for row in spending_data:
            avg_monthly = abs(row.total) / months
            category_spending[row.category] = {
                "average_monthly": int(avg_monthly),
                "transaction_count": row.count
            }

        return category_spending

    def generate_budget(
        self,
        db: Session,
        user_id: int,
        monthly_income: int,
        feedback: str | None = None,
        language: str = "ja"
    ) -> dict[str, Any]:
        """Generate budget using Claude AI.

        Args:
            db: Database session
            user_id: User ID
            monthly_income: Monthly income amount (in cents)
            feedback: Optional user feedback for regeneration
            language: Language code for response (ja, en, vi)

        Returns:
            dict with allocations, savings_target, advice
        """
        # Fetch spending data for both timeframes
        recent_spending = self._get_spending_summary(db, user_id, days=90)   # 3 months
        annual_spending = self._get_spending_summary(db, user_id, days=365)  # 12 months

        # Build prompt for Claude
        prompt = self._build_budget_prompt(
            monthly_income=monthly_income,
            recent_spending=recent_spending,
            annual_spending=annual_spending,
            feedback=feedback,
            language=language
        )

        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Parse response
        budget_data = self._parse_budget_response(response.content[0].text)
        return budget_data

    def generate_budget_with_tracking(
        self,
        db: Session,
        user_id: int,
        monthly_income: int,
        feedback: str | None = None,
        language: str = "ja"
    ) -> tuple[dict[str, Any], dict[str, int]]:
        """Generate budget with token usage tracking for credit deduction.

        Args:
            db: Database session
            user_id: User ID
            monthly_income: Monthly income amount (in cents)
            feedback: Optional user feedback for regeneration
            language: Language code for response (ja, en, vi)

        Returns:
            Tuple of (budget_data dict, usage dict with input_tokens and output_tokens)
        """
        # Fetch spending data for both timeframes
        recent_spending = self._get_spending_summary(db, user_id, days=90)   # 3 months
        annual_spending = self._get_spending_summary(db, user_id, days=365)  # 12 months

        # Build prompt for Claude
        prompt = self._build_budget_prompt(
            monthly_income=monthly_income,
            recent_spending=recent_spending,
            annual_spending=annual_spending,
            feedback=feedback,
            language=language
        )

        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extract token usage from response
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        # Parse response
        budget_data = self._parse_budget_response(response.content[0].text)

        return budget_data, usage

    def _build_budget_prompt(
        self,
        monthly_income: int,
        recent_spending: dict[str, dict],
        annual_spending: dict[str, dict],
        feedback: str | None,
        language: str = "ja"
    ) -> str:
        """Build prompt for Claude AI.

        Args:
            monthly_income: Monthly income in cents
            recent_spending: Last 3 months spending by category (current habits)
            annual_spending: Last 12 months spending by category (seasonal patterns)
            feedback: User feedback for regeneration
            language: Language code for response (ja, en, vi)

        Returns:
            Formatted prompt string
        """
        # Map language codes to full names for prompt
        language_map = {
            "ja": "Japanese",
            "en": "English",
            "vi": "Vietnamese"
        }
        language_name = language_map.get(language, "Japanese")

        income_display = f"¥{monthly_income:,}"

        # Format recent spending (3 months - current habits)
        recent_str = "\n".join([
            f"  - {cat}: ¥{data['average_monthly']:,}/month ({data['transaction_count']} txns)"
            for cat, data in recent_spending.items()
        ]) if recent_spending else "  No recent data"

        # Format annual spending (12 months - seasonal patterns)
        annual_str = "\n".join([
            f"  - {cat}: ¥{data['average_monthly']:,}/month ({data['transaction_count']} txns)"
            for cat, data in annual_spending.items()
        ]) if annual_spending else "  No annual data"

        prompt = f"""IMPORTANT: You MUST respond entirely in {language_name} language. All text fields including advice, reasoning, and category names must be in {language_name}.

You are a personal finance advisor helping create a monthly budget.

INCOME: {income_display}/month

RECENT SPENDING (last 3 months - reflects current habits):
{recent_str}

ANNUAL SPENDING (last 12 months - captures seasonal patterns):
{annual_str}

{'USER FEEDBACK: ' + feedback if feedback else ''}

ANALYSIS GUIDANCE:
- Use RECENT spending to understand current lifestyle and immediate priorities
- Use ANNUAL spending to identify seasonal expenses (holidays, vacations, insurance)
- If a category appears only in annual data, it may be periodic/seasonal
- If recent spending differs significantly from annual, note the trend

TASK: Create a realistic, balanced monthly budget that:
1. Allocates funds across relevant expense categories
2. Recommends a reasonable savings target (20-30% of income if possible)
3. Considers both recent habits AND seasonal patterns
4. Follows the 50/30/20 rule (needs/wants/savings) as a guideline
5. Provides 1-2 sentences of practical advice

REQUIRED OUTPUT FORMAT (JSON):
{{
  "allocations": [
    {{"category": "Housing", "amount": 50000, "reasoning": "Based on historical spending"}},
    {{"category": "Food", "amount": 30000, "reasoning": "Slightly reduced from historical average"}},
    ...
  ],
  "savings_target": 20000,
  "advice": "Your advice here in 1-2 sentences"
}}

RULES:
- Use Japanese Yen (¥) as currency
- All amounts must be integers (no decimals)
- Total allocations + savings should not exceed income
- Include 5-10 categories maximum
- Provide brief reasoning for each allocation
- Be realistic and practical

Generate the budget now:"""

        return prompt

    def _parse_budget_response(self, response_text: str) -> dict[str, Any]:
        """Parse Claude's budget response.

        Args:
            response_text: Claude API response text

        Returns:
            Parsed budget data dict
        """
        # Extract JSON from response (Claude sometimes adds text before/after)
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1

        if start_idx == -1 or end_idx == 0:
            raise ValueError("No valid JSON found in Claude response")

        json_str = response_text[start_idx:end_idx]
        budget_data = json.loads(json_str)

        # Validate structure
        if "allocations" not in budget_data or not isinstance(budget_data["allocations"], list):
            raise ValueError("Invalid budget format: missing allocations array")

        for alloc in budget_data["allocations"]:
            if "category" not in alloc or "amount" not in alloc:
                raise ValueError("Invalid allocation format: missing category or amount")

        return budget_data

    def categorize_transactions(
        self,
        transactions: list[dict],
        available_categories: list[str] | dict[str, list[str]],
        language: str = "ja"
    ) -> tuple[list[dict], dict[str, int]]:
        """Categorize transactions using Claude AI.

        Args:
            transactions: List of dicts with id, description, amount
            available_categories: Either flat list of category names OR
                                  dict mapping parent -> list of children for hierarchy
            language: Language code for response

        Returns:
            Tuple of (categorization results, usage dict with tokens)
        """
        if not transactions:
            return [], {"input_tokens": 0, "output_tokens": 0}

        # Build prompt for Claude - detect if hierarchical
        if isinstance(available_categories, dict):
            prompt = self._build_hierarchical_categorization_prompt(
                transactions=transactions,
                category_hierarchy=available_categories,
                language=language
            )
        else:
            prompt = self._build_categorization_prompt(
                transactions=transactions,
                available_categories=available_categories,
                language=language
            )

        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=0.3,  # Lower temp for more consistent categorization
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extract token usage
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        # Parse response
        results = self._parse_categorization_response(response.content[0].text)
        return results, usage

    def _build_categorization_prompt(
        self,
        transactions: list[dict],
        available_categories: list[str],
        language: str = "ja"
    ) -> str:
        """Build prompt for transaction categorization."""
        language_map = {
            "ja": "Japanese",
            "en": "English",
            "vi": "Vietnamese"
        }
        language_name = language_map.get(language, "Japanese")

        # Format transactions list
        tx_list = "\n".join([
            f'{i+1}. ID:{tx["id"]} | "{tx["description"]}" | ¥{abs(tx["amount"]):,}'
            for i, tx in enumerate(transactions)
        ])

        categories_str = ", ".join(available_categories)

        prompt = f"""You are a financial transaction categorizer. Analyze each transaction description and assign the most appropriate category.

AVAILABLE CATEGORIES (you MUST use one of these, or suggest a new one if none fit):
{categories_str}

TRANSACTIONS TO CATEGORIZE:
{tx_list}

TASK: For each transaction, determine the best category based on the description.
- Match merchant names, keywords, and context clues
- Use the most specific category that applies
- If no existing category fits well, suggest "NEW:CategoryName" format
- Be consistent with similar transactions

REQUIRED OUTPUT FORMAT (JSON array):
[
  {{"id": 123, "category": "Food", "confidence": 0.95, "reason": "Restaurant name detected"}},
  {{"id": 456, "category": "Transportation", "confidence": 0.85, "reason": "Train station keyword"}},
  {{"id": 789, "category": "NEW:Subscription", "confidence": 0.80, "reason": "Monthly recurring service fee"}}
]

RULES:
- Return ONLY valid JSON array
- Include all transaction IDs from input
- confidence should be 0.0-1.0
- reason should be brief (under 50 chars)
- Respond in {language_name} for the reason field

Generate categorizations now:"""

        return prompt

    def _build_hierarchical_categorization_prompt(
        self,
        transactions: list[dict],
        category_hierarchy: dict[str, list[str]],
        language: str = "ja"
    ) -> str:
        """Build prompt for hierarchical transaction categorization."""
        language_map = {
            "ja": "Japanese",
            "en": "English",
            "vi": "Vietnamese"
        }
        language_name = language_map.get(language, "Japanese")

        # Format transactions list
        tx_list = "\n".join([
            f'{i+1}. ID:{tx["id"]} | "{tx["description"]}" | ¥{abs(tx["amount"]):,}'
            for i, tx in enumerate(transactions)
        ])

        # Build hierarchy string
        hierarchy_lines = []
        for parent, children in category_hierarchy.items():
            children_str = ", ".join(children)
            hierarchy_lines.append(f"- {parent}: {children_str}")
        hierarchy_str = "\n".join(hierarchy_lines)

        prompt = f"""You are a financial transaction categorizer. Analyze each transaction and suggest the most appropriate CHILD category.

CATEGORY HIERARCHY (Parent: Children):
{hierarchy_str}

TRANSACTIONS TO CATEGORIZE:
{tx_list}

TASK: For each transaction, determine the best CHILD category based on the description.
- Always return a CHILD category (not parent)
- Match merchant names, keywords, and context clues
- If unsure, use "Misc" child under the most likely parent
- For new/unique items, suggest "NEW:CategoryName" under appropriate parent

REQUIRED OUTPUT FORMAT (JSON array):
[
  {{"id": 123, "category": "Cafe", "parent": "Food", "confidence": 0.95, "reason": "Starbucks detected"}},
  {{"id": 456, "category": "Train", "parent": "Transportation", "confidence": 0.85, "reason": "Station keyword"}},
  {{"id": 789, "category": "NEW:Gym", "parent": "Health", "confidence": 0.80, "reason": "Fitness facility"}}
]

RULES:
- Return ONLY valid JSON array
- Include all transaction IDs from input
- category = child category name
- parent = parent category name
- confidence should be 0.0-1.0
- reason should be brief (under 50 chars)
- Respond in {language_name} for the reason field

Generate categorizations now:"""

        return prompt

    def _parse_categorization_response(self, response_text: str) -> list[dict]:
        """Parse Claude's categorization response."""
        # Extract JSON from response
        start_idx = response_text.find("[")
        end_idx = response_text.rfind("]") + 1

        if start_idx == -1 or end_idx == 0:
            raise ValueError("No valid JSON array found in Claude response")

        json_str = response_text[start_idx:end_idx]
        results = json.loads(json_str)

        # Validate structure
        if not isinstance(results, list):
            raise ValueError("Invalid categorization format: expected array")

        for item in results:
            if "id" not in item or "category" not in item:
                raise ValueError("Invalid categorization item: missing id or category")

        return results
