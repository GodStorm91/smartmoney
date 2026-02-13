"""Tool definitions for Claude AI chat assistant."""
from typing import Any


def get_tool_definitions() -> list[dict[str, Any]]:
    """Get tool definitions for Claude AI function calling.

    Returns:
        List of tool definition dictionaries
    """
    return [
        {
            "name": "get_transactions",
            "description": "Fetch recent transactions from the user's account. Use this to answer questions about spending history, recent purchases, or transaction patterns.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to look back (30-90). Defaults to 30.",
                        "minimum": 1,
                        "maximum": 90,
                        "default": 30
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter to show only transactions in a specific category"
                    }
                },
                "required": []
            }
        },
        {
            "name": "create_transaction",
            "description": "Create a new financial transaction. Use this when the user wants to add a new expense or income. This tool will return a confirmation request to the user before creating the transaction.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string",
                        "description": "Transaction description (e.g., 'Starbucks coffee', 'Salary payment')"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Amount in JPY. Positive for income, negative for expenses."
                    },
                    "category": {
                        "type": "string",
                        "description": "Category name from the user's available categories"
                    },
                    "date": {
                        "type": "string",
                        "format": "date",
                        "description": "Transaction date in YYYY-MM-DD format. Defaults to today if not specified."
                    },
                    "is_income": {
                        "type": "boolean",
                        "description": "Whether this is an income transaction (true) or expense (false). Defaults to false."
                    }
                },
                "required": ["description", "amount", "category"]
            }
        },
        {
            "name": "get_budget",
            "description": "Fetch the user's current budget allocations and spending status. Use this to answer questions about budget limits, spending vs budget, or remaining budget.",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    ]
