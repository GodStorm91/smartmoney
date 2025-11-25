"""Claude AI service for budget generation."""
import json
from datetime import date, timedelta
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
        # Fetch historical spending data (last 3 months)
        three_months_ago = date.today() - timedelta(days=90)
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
                Transaction.date >= three_months_ago
            )
            .group_by(Transaction.category)
            .all()
        )

        # Calculate average monthly spending per category
        category_spending = {}
        for row in spending_data:
            # Divide by 3 to get monthly average
            avg_monthly = abs(row.total) / 3
            category_spending[row.category] = {
                "average_monthly": int(avg_monthly),
                "transaction_count": row.count
            }

        # Build prompt for Claude
        prompt = self._build_budget_prompt(
            monthly_income=monthly_income,
            category_spending=category_spending,
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
        # Fetch historical spending data (last 3 months)
        three_months_ago = date.today() - timedelta(days=90)
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
                Transaction.date >= three_months_ago
            )
            .group_by(Transaction.category)
            .all()
        )

        # Calculate average monthly spending per category
        category_spending = {}
        for row in spending_data:
            # Divide by 3 to get monthly average
            avg_monthly = abs(row.total) / 3
            category_spending[row.category] = {
                "average_monthly": int(avg_monthly),
                "transaction_count": row.count
            }

        # Build prompt for Claude
        prompt = self._build_budget_prompt(
            monthly_income=monthly_income,
            category_spending=category_spending,
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
        category_spending: dict[str, dict],
        feedback: str | None,
        language: str = "ja"
    ) -> str:
        """Build prompt for Claude AI.

        Args:
            monthly_income: Monthly income in cents
            category_spending: Historical spending by category
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

        # Format spending history
        spending_str = "\n".join([
            f"  - {cat}: ¥{data['average_monthly']:,} (avg/month, {data['transaction_count']} transactions)"
            for cat, data in category_spending.items()
        ])

        prompt = f"""IMPORTANT: You MUST respond entirely in {language_name} language. All text fields including advice, reasoning, and category names must be in {language_name}.

You are a personal finance advisor helping create a monthly budget.

INCOME: {income_display}/month

HISTORICAL SPENDING (last 3 months average):
{spending_str if spending_str else "  No historical data available"}

{'USER FEEDBACK: ' + feedback if feedback else ''}

TASK: Create a realistic, balanced monthly budget that:
1. Allocates funds across relevant expense categories
2. Recommends a reasonable savings target (20-30% of income if possible)
3. Considers historical spending patterns
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
