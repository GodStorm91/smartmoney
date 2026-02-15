"""Claude AI service for budget generation and chat assistant."""
import json
import logging
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
from .chat_context_builder import build_financial_context, get_available_categories
from .tool_definitions import get_tool_definitions
from .tool_executor import ToolExecutor

logger = logging.getLogger(__name__)


class ClaudeAIService:
    """Service for Claude AI integration."""

    def __init__(self):
        """Initialize Claude AI client."""
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-haiku-4-5-20251001"
        self.chat_model = "claude-sonnet-4-5-20250929"  # Sonnet for chat with tool calling

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

    def chat_with_context(
        self,
        db: Session,
        user_id: int,
        messages: list[dict[str, str]],
        language: str = "ja"
    ) -> tuple[dict[str, Any], dict[str, int]]:
        """Chat with Claude AI about financial data with tool calling support.

        Args:
            db: Database session
            user_id: User ID
            messages: List of message dicts with role and content
            language: Language code for response (ja, en, vi)

        Returns:
            Tuple of (response_data dict, usage dict with token counts)
            response_data contains: message, and optional action for confirmation
        """
        # Build financial context
        context = build_financial_context(db, user_id, days=30)
        categories = get_available_categories(db, user_id)

        # Build system message with context
        language_map = {"ja": "Japanese", "en": "English", "vi": "Vietnamese"}
        language_name = language_map.get(language, "Japanese")

        system_message = f"""You are a helpful financial assistant for SmartMoney app. You help users manage their finances by answering questions and performing actions.

IMPORTANT: Respond entirely in {language_name}.

AVAILABLE CATEGORIES:
{', '.join(categories)}

{context}

INSTRUCTIONS:
- Use tools to fetch data or suggest actions
- For mutation tools (create_transaction), the system will ask user for confirmation
- Be concise and helpful
- Always respond in {language_name}
- Use ¥ symbol for amounts
- When suggesting to create a transaction, ask if the user wants to proceed
"""

        # Get tool definitions
        tools = get_tool_definitions()

        # Prepare API messages
        api_messages = messages.copy()

        # Initialize tool executor
        executor = ToolExecutor(db, user_id)

        # Call Claude API with tools
        try:
            response = self.client.messages.create(
                model=self.chat_model,
                max_tokens=2048,
                temperature=0.7,
                system=system_message,
                messages=api_messages,
                tools=tools
            )

            usage = {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }

            # Process response
            tool_results = []
            suggested_action = None
            assistant_message = ""

            # Check for tool use in response
            for block in response.content:
                if block.type == "text":
                    assistant_message += block.text
                elif block.type == "tool_use":
                    # Execute tool
                    tool_name = block.name
                    tool_params = block.input

                    logger.info(f"Executing tool: {tool_name} with params: {tool_params}")

                    try:
                        result = executor.execute(tool_name, tool_params)

                        # Check if this is a mutation tool requiring confirmation
                        if result.get("requires_confirmation"):
                            suggested_action = {
                                "type": result["tool"],
                                "payload": result["payload"],
                                "description": f"Create transaction: {result['payload']['description']}"
                            }
                            # Don't add to tool_results - we want user confirmation first
                        else:
                            # Add result to send back to Claude
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": json.dumps(result)
                            })
                    except Exception as e:
                        logger.error(f"Tool execution failed: {e}", exc_info=True)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps({
                                "error": "execution",
                                "message": str(e)
                            }),
                            "is_error": True
                        })

            # If we have tool results, make another API call to get final response
            if tool_results:
                # Add assistant response with tool use
                api_messages.append({
                    "role": "assistant",
                    "content": response.content
                })

                # Add tool results
                api_messages.append({
                    "role": "user",
                    "content": tool_results
                })

                # Get final response from Claude
                final_response = self.client.messages.create(
                    model=self.chat_model,
                    max_tokens=2048,
                    temperature=0.7,
                    system=system_message,
                    messages=api_messages
                )

                # Update usage
                usage["input_tokens"] += final_response.usage.input_tokens
                usage["output_tokens"] += final_response.usage.output_tokens

                # Extract final message
                assistant_message = ""
                for block in final_response.content:
                    if block.type == "text":
                        assistant_message += block.text

            # Build response
            response_data = {
                "message": assistant_message or "I'm ready to help with your finances!"
            }

            if suggested_action:
                response_data["action"] = suggested_action

            return response_data, usage

        except Exception as e:
            logger.error(f"Chat API error: {e}", exc_info=True)
            raise
