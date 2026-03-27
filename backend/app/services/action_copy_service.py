"""Generate personalized action copy using Claude AI."""
import logging
from anthropic import Anthropic
from ..config import settings

logger = logging.getLogger(__name__)


def generate_action_copy(
    action_type: str, params: dict, language: str = "en"
) -> tuple[str, str]:
    """Generate personalized title + description for an action.

    Falls back to template strings if AI fails or no API key.
    Returns (title, description).
    """
    templates = _get_templates(action_type, params)

    if not settings.anthropic_api_key:
        return templates

    try:
        client = Anthropic(api_key=settings.anthropic_api_key)
        prompt = _build_prompt(action_type, params, language)

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()

        # Parse "Title: ...\nDescription: ..." format
        lines = text.split("\n", 1)
        title = lines[0].replace("Title:", "").strip()
        desc = lines[1].replace("Description:", "").strip() if len(lines) > 1 else ""

        # Sanity check: title must be non-empty and < 200 chars
        if title and len(title) < 200:
            return title, desc
        return templates
    except Exception as e:
        logger.debug(f"AI copy generation failed, using template: {e}")
        return templates


def _build_prompt(action_type: str, params: dict, language: str) -> str:
    lang_instruction = {
        "en": "Write in English.",
        "ja": "日本語で書いてください。",
        "vi": "Viết bằng tiếng Việt.",
    }.get(language, "Write in English.")

    context_map = {
        "review_uncategorized": (
            f"{params.get('count', 0)} transactions are uncategorized this month."
        ),
        "copy_or_create_budget": (
            f"No budget exists for {params.get('month', 'this month')}."
        ),
        "adjust_budget_category": (
            f"{params.get('category', 'A category')} spent "
            f"{params.get('spent', 0):,} vs budgeted {params.get('allocated', 0):,}."
        ),
        "review_goal_catch_up": (
            f"{params.get('goalName', 'A goal')} is behind. "
            f"Need {params.get('monthlyNeeded', 0):,}/month to catch up."
        ),
    }

    return f"""Generate a short, friendly action suggestion for a personal finance app.
Context: {context_map.get(action_type, '')}
{lang_instruction}

Rules:
- Title: max 60 chars, concrete, no jargon
- Description: max 120 chars, helpful tone, include specific numbers
- No guilt language. Frame as opportunity.
- Format: Title: ...\nDescription: ..."""


def _get_templates(action_type: str, params: dict) -> tuple[str, str]:
    """Fallback template strings."""
    templates = {
        "review_uncategorized": (
            f"{params.get('count', 0)} uncategorized transactions this month",
            "Review and categorize for better insights.",
        ),
        "copy_or_create_budget": (
            f"No budget for {params.get('month', 'this month')}",
            "Create from last month or start fresh.",
        ),
        "adjust_budget_category": (
            f"{params.get('category', 'Category')} over budget by "
            f"{(params.get('spent', 0) - params.get('allocated', 0)):,}",
            f"Spent {params.get('spent', 0):,} vs budgeted {params.get('allocated', 0):,}.",
        ),
        "review_goal_catch_up": (
            f"Goal '{params.get('goalName', '')}' is behind schedule",
            f"Need ~{params.get('monthlyNeeded', 0):,}/mo to catch up.",
        ),
    }
    return templates.get(action_type, ("Action needed", ""))
