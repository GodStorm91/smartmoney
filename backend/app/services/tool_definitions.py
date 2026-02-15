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
        },
        {
            "name": "get_goals",
            "description": "Fetch all financial goals with progress tracking. Use this to answer questions about savings goals, goal progress, target amounts, and goal achievability.",
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        {
            "name": "get_analytics",
            "description": "Fetch spending trends, category breakdown, and monthly comparisons. Use this to answer questions about spending patterns, top categories, or comparing months.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "months": {
                        "type": "integer",
                        "description": "Number of months to analyze (1-12). Defaults to 3.",
                        "minimum": 1,
                        "maximum": 12,
                        "default": 3
                    }
                },
                "required": []
            }
        },
        {
            "name": "get_insights",
            "description": "Get AI-generated financial insights and recommendations. Use this to provide proactive advice on spending, budgeting, and goal progress.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of insights to return. Defaults to 5.",
                        "minimum": 1,
                        "maximum": 10,
                        "default": 5
                    }
                },
                "required": []
            }
        },
        {
            "name": "get_accounts",
            "description": "Fetch all user accounts with balances and net worth summary. Use this to answer questions about account balances, total assets, or net worth.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "include_inactive": {
                        "type": "boolean",
                        "description": "Include inactive accounts. Defaults to false.",
                        "default": False
                    }
                },
                "required": []
            }
        },
        {
            "name": "create_goal",
            "description": "Create a new financial goal. Use this when the user wants to set a savings goal. This tool will return a confirmation request to the user before creating the goal.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "years": {
                        "type": "integer",
                        "description": "Goal time horizon in years (1, 3, 5, or 10)",
                        "enum": [1, 3, 5, 10]
                    },
                    "target_amount": {
                        "type": "integer",
                        "description": "Target amount to save (in JPY)"
                    },
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Optional start date in YYYY-MM-DD format. Defaults to today if not specified."
                    }
                },
                "required": ["years", "target_amount"]
            }
        },
        {
            "name": "update_budget",
            "description": "Update budget category allocation. Use this when the user wants to adjust budget limits for a category. This tool will return a confirmation request to the user before updating the budget.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Category name to update"
                    },
                    "amount": {
                        "type": "integer",
                        "description": "New budget amount for the category (in JPY)"
                    }
                },
                "required": ["category", "amount"]
            }
        }
    ]
