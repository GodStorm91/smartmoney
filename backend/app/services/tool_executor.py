"""Tool executor for AI chat assistant."""
import logging
from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from ..models.budget import Budget
from ..models.transaction import Transaction
from ..services.transaction_service import TransactionService
from ..services.budget_tracking_service import BudgetTrackingService

logger = logging.getLogger(__name__)


class ToolExecutor:
    """Execute AI tools with validation and permission checks."""

    def __init__(self, db: Session, user_id: int):
        """Initialize tool executor.

        Args:
            db: Database session
            user_id: User ID for row-level security
        """
        self.db = db
        self.user_id = user_id
        self.transaction_service = TransactionService()
        self.budget_tracking_service = BudgetTrackingService()

    def execute(self, tool_name: str, params: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool with permission checks.

        Args:
            tool_name: Name of the tool to execute
            params: Tool parameters

        Returns:
            Tool execution result

        Raises:
            PermissionError: If user doesn't have permission
            ValueError: If tool name is invalid
        """
        # Route to appropriate tool handler
        if tool_name == "get_transactions":
            return self._get_transactions(params)
        elif tool_name == "create_transaction":
            return self._create_transaction(params)
        elif tool_name == "get_budget":
            return self._get_budget(params)
        else:
            raise ValueError(f"Unknown tool: {tool_name}")

    def _get_transactions(self, params: dict[str, Any]) -> dict[str, Any]:
        """Fetch recent transactions.

        Args:
            params: Tool parameters (days, category)

        Returns:
            Transaction list with summary
        """
        days = params.get("days", 30)
        category = params.get("category")

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        # Fetch transactions
        transactions = self.transaction_service.get_transactions(
            db=self.db,
            user_id=self.user_id,
            start_date=start_date,
            end_date=end_date,
            categories=[category] if category else None,
            limit=100
        )

        # Format response
        total_income = sum(t.amount for t in transactions if t.is_income)
        total_expenses = sum(abs(t.amount) for t in transactions if not t.is_income and not t.is_transfer)

        return {
            "success": True,
            "count": len(transactions),
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_cashflow": total_income - total_expenses,
            "transactions": [
                {
                    "id": t.id,
                    "date": t.date.isoformat(),
                    "description": t.description,
                    "amount": t.amount,
                    "category": t.category,
                    "is_income": t.is_income
                }
                for t in transactions
            ]
        }

    def _create_transaction(self, params: dict[str, Any]) -> dict[str, Any]:
        """Parse transaction creation parameters and return for confirmation.

        This is a mutation tool - it returns the parsed parameters for user confirmation
        rather than executing immediately.

        Args:
            params: Tool parameters (description, amount, category, date, is_income)

        Returns:
            Parsed transaction parameters for confirmation
        """
        description = params.get("description")
        amount = params.get("amount")
        category = params.get("category")
        transaction_date = params.get("date", date.today().isoformat())
        is_income = params.get("is_income", False)

        # Validate required fields
        if not description:
            return {"error": "validation", "message": "Transaction description is required"}
        if not amount:
            return {"error": "validation", "message": "Transaction amount is required"}
        if not category:
            return {"error": "validation", "message": "Transaction category is required"}

        # Return parsed parameters for confirmation (don't execute yet)
        return {
            "requires_confirmation": True,
            "tool": "create_transaction",
            "payload": {
                "description": description,
                "amount": int(amount),
                "category": category,
                "date": transaction_date,
                "is_income": is_income
            }
        }

    def _get_budget(self, params: dict[str, Any]) -> dict[str, Any]:
        """Fetch current budget allocations and spending.

        Args:
            params: Tool parameters (none required)

        Returns:
            Budget allocations with spending data
        """
        # Get current month budget
        current_month = date.today().strftime("%Y-%m")

        budget = self.db.query(Budget).filter(
            Budget.user_id == self.user_id,
            Budget.month == current_month,
            Budget.is_active == True
        ).first()

        if not budget:
            return {
                "success": False,
                "message": "No active budget found for current month"
            }

        # Calculate spending per category manually
        spending_data = {}
        start_of_month = date.today().replace(day=1)

        transactions = self.db.query(Transaction).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_of_month,
            Transaction.date <= date.today(),
            Transaction.is_income == False,
            Transaction.is_transfer == False
        ).all()

        for tx in transactions:
            category = tx.category
            spending_data[category] = spending_data.get(category, 0) + abs(tx.amount)

        # Build response
        allocations = []
        for alloc in budget.allocations:
            spent = spending_data.get(alloc.category, 0)
            remaining = alloc.amount - spent
            percentage = (spent / alloc.amount * 100) if alloc.amount > 0 else 0

            allocations.append({
                "category": alloc.category,
                "limit": alloc.amount,
                "spent": spent,
                "remaining": remaining,
                "percentage": round(percentage, 1)
            })

        return {
            "success": True,
            "month": current_month,
            "monthly_income": budget.monthly_income,
            "savings_target": budget.savings_target,
            "allocations": allocations
        }

    def execute_confirmed_action(self, action_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Execute a confirmed mutation action.

        This is called after the user confirms an action in the UI.

        Args:
            action_type: Type of action (e.g., "create_transaction")
            payload: Action payload with validated parameters

        Returns:
            Execution result

        Raises:
            ValueError: If action type is invalid
        """
        if action_type == "create_transaction":
            return self._execute_create_transaction(payload)
        else:
            raise ValueError(f"Unknown action type: {action_type}")

    def _execute_create_transaction(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Execute transaction creation after user confirmation.

        Args:
            payload: Transaction data

        Returns:
            Created transaction result
        """
        try:
            # Parse date
            transaction_date = date.fromisoformat(payload["date"])

            # Create transaction
            transaction = self.transaction_service.create_transaction(
                db=self.db,
                transaction_data={
                    "user_id": self.user_id,
                    "description": payload["description"],
                    "amount": payload["amount"],
                    "category": payload["category"],
                    "date": transaction_date,
                    "is_income": payload.get("is_income", False),
                    "is_transfer": False,
                    "source": "ai_chat",
                    "currency": "JPY",
                    "month_key": transaction_date.strftime("%Y-%m"),
                    "tx_hash": f"chat_{self.user_id}_{transaction_date}_{payload['description'][:20]}_{payload['amount']}"
                }
            )

            return {
                "success": True,
                "transaction_id": transaction.id,
                "message": f"Transaction created: {payload['description']} - ¥{payload['amount']:,}"
            }
        except Exception as e:
            logger.error(f"Failed to create transaction: {e}", exc_info=True)
            return {
                "success": False,
                "error": "execution",
                "message": f"Failed to create transaction: {str(e)}"
            }
