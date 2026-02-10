"""Claude AI service for budget generation."""
import json
from typing import Any

from anthropic import Anthropic
from sqlalchemy.orm import Session

from ..config import settings
from .budget_prompt_helpers import (
    build_budget_prompt as _build_budget_prompt,
    fetch_category_spending as _fetch_category_spending,
    fetch_valid_categories as _fetch_valid_categories,
    parse_budget_response as _parse_budget_response,
)


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
        category_spending = _fetch_category_spending(db, user_id)
        valid_categories = _fetch_valid_categories(db, user_id)

        prompt = _build_budget_prompt(
            monthly_income=monthly_income,
            category_spending=category_spending,
            valid_categories=valid_categories,
            feedback=feedback,
            language=language
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        budget_data = _parse_budget_response(
            response.content[0].text, valid_categories
        )
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
        category_spending = _fetch_category_spending(db, user_id)
        valid_categories = _fetch_valid_categories(db, user_id)

        prompt = _build_budget_prompt(
            monthly_income=monthly_income,
            category_spending=category_spending,
            valid_categories=valid_categories,
            feedback=feedback,
            language=language
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        budget_data = _parse_budget_response(
            response.content[0].text, valid_categories
        )
        return budget_data, usage

    def categorize_transactions(
        self,
        transactions: list[dict],
        available_categories: dict[str, list[str]],
        language: str = "ja"
    ) -> tuple[list[dict], dict[str, int]]:
        """Categorize transactions using Claude AI.

        Args:
            transactions: List of {id, description, amount} dicts
            available_categories: Dict of parent_category -> [child_categories]
            language: Language code for response

        Returns:
            Tuple of (list of categorization results, usage dict)
        """
        language_map = {"ja": "Japanese", "en": "English", "vi": "Vietnamese"}
        language_name = language_map.get(language, "Japanese")

        # Format categories for prompt
        cat_str = "\n".join([
            f"  {parent}: {', '.join(children)}"
            for parent, children in available_categories.items()
        ])

        # Format transactions for prompt
        tx_str = "\n".join([
            f"  - ID: {tx['id']}, Description: {tx['description']}, Amount: ¥{abs(tx['amount']):,}"
            for tx in transactions
        ])

        prompt = f"""IMPORTANT: You MUST respond entirely in {language_name} language for the "reason" field.

You are a financial transaction categorizer. Categorize the following transactions into the most appropriate category.

AVAILABLE CATEGORIES:
{cat_str}

TRANSACTIONS TO CATEGORIZE:
{tx_str}

REQUIRED OUTPUT FORMAT (JSON array):
[
  {{"id": 123, "category": "Food", "confidence": 0.9, "reason": "Description suggests food purchase"}},
  ...
]

RULES:
- Use ONLY categories from the available list above
- If a transaction clearly doesn't fit any existing category, prefix with "NEW:" (e.g. "NEW:Pet Care")
- Confidence should be between 0.0 and 1.0
- Provide a brief reason for each categorization in {language_name}
- Return a JSON array only, no other text

Categorize now:"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )

        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        # Parse JSON response
        response_text = response.content[0].text
        start_idx = response_text.find("[")
        end_idx = response_text.rfind("]") + 1

        if start_idx == -1 or end_idx == 0:
            raise ValueError("No valid JSON array found in Claude response")

        results = json.loads(response_text[start_idx:end_idx])
        return results, usage
