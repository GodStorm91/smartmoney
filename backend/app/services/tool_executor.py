"""Tool executor for AI chat assistant."""
import logging
from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from ..models.budget import Budget
from ..models.transaction import Transaction
from ..services.transaction_service import TransactionService
from ..services.budget_tracking_service import BudgetTrackingService
from ..services.goal_service import GoalService
from ..services.account_service import AccountService
from ..services.insight_generator_service import InsightGeneratorService
from ..services.budget_service import BudgetService

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
        self.goal_service = GoalService()
        self.account_service = AccountService()
        self.insight_service = InsightGeneratorService()
        self.budget_service = BudgetService()

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
        elif tool_name == "get_goals":
            return self._get_goals(params)
        elif tool_name == "get_analytics":
            return self._get_analytics(params)
        elif tool_name == "get_insights":
            return self._get_insights(params)
        elif tool_name == "get_accounts":
            return self._get_accounts(params)
        elif tool_name == "create_goal":
            return self._create_goal(params)
        elif tool_name == "update_budget":
            return self._update_budget(params)
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
        elif action_type == "create_goal":
            return self._execute_create_goal(payload)
        elif action_type == "update_budget":
            return self._execute_update_budget(payload)
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

    def _get_goals(self, params: dict[str, Any]) -> dict[str, Any]:
        """Fetch all financial goals with progress.

        Args:
            params: Tool parameters (none required)

        Returns:
            Goals list with progress data
        """
        goals = self.goal_service.get_all_goals(self.db, self.user_id)

        if not goals:
            return {
                "success": True,
                "count": 0,
                "message": "No financial goals set yet"
            }

        goals_data = []
        for goal in goals:
            progress = self.goal_service.calculate_goal_progress(self.db, self.user_id, goal)
            goals_data.append(progress)

        return {
            "success": True,
            "count": len(goals_data),
            "goals": goals_data
        }

    def _get_analytics(self, params: dict[str, Any]) -> dict[str, Any]:
        """Fetch spending analytics and trends.

        Args:
            params: Tool parameters (months)

        Returns:
            Analytics data with trends and category breakdown
        """
        from sqlalchemy import func

        months = params.get("months", 3)
        end_date = date.today()
        start_date = end_date - timedelta(days=30 * months)

        # Get monthly spending totals
        monthly_data = self.db.query(
            Transaction.month_key,
            func.sum(func.abs(Transaction.amount)).label("total")
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.is_income == False,
            Transaction.is_transfer == False
        ).group_by(
            Transaction.month_key
        ).order_by(
            Transaction.month_key
        ).all()

        # Get category breakdown for entire period
        category_data = self.db.query(
            Transaction.category,
            func.sum(func.abs(Transaction.amount)).label("total"),
            func.count(Transaction.id).label("count")
        ).filter(
            Transaction.user_id == self.user_id,
            Transaction.date >= start_date,
            Transaction.date <= end_date,
            Transaction.is_income == False,
            Transaction.is_transfer == False
        ).group_by(
            Transaction.category
        ).order_by(
            func.sum(func.abs(Transaction.amount)).desc()
        ).limit(10).all()

        # Calculate trend
        if len(monthly_data) >= 2:
            recent_month = monthly_data[-1].total
            previous_month = monthly_data[-2].total
            trend = ((recent_month - previous_month) / previous_month * 100) if previous_month > 0 else 0
        else:
            trend = 0

        return {
            "success": True,
            "period_months": months,
            "monthly_trend": [
                {"month": row.month_key, "total": int(row.total)}
                for row in monthly_data
            ],
            "trend_percentage": round(trend, 1),
            "top_categories": [
                {
                    "category": row.category,
                    "total": int(row.total),
                    "count": row.count
                }
                for row in category_data
            ]
        }

    def _get_insights(self, params: dict[str, Any]) -> dict[str, Any]:
        """Get AI-generated financial insights.

        Args:
            params: Tool parameters (limit)

        Returns:
            List of insights
        """
        import asyncio

        limit = params.get("limit", 5)

        # Run async insight generation
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            insights = loop.run_until_complete(
                self.insight_service.generate_dashboard_insights(
                    self.db, self.user_id, limit=limit
                )
            )
        except (AttributeError, Exception) as e:
            logger.warning(f"Insight generation failed: {e}")
            return {
                "success": False,
                "error": "Insight generation is temporarily unavailable",
                "insights": []
            }
        finally:
            loop.close()

        return {
            "success": True,
            "count": len(insights),
            "insights": insights
        }

    def _get_accounts(self, params: dict[str, Any]) -> dict[str, Any]:
        """Fetch all accounts with balances.

        Args:
            params: Tool parameters (include_inactive)

        Returns:
            Accounts list with balances and net worth
        """
        include_inactive = params.get("include_inactive", False)

        accounts = self.account_service.get_all_accounts(
            self.db, self.user_id, include_inactive=include_inactive
        )

        if not accounts:
            return {
                "success": True,
                "count": 0,
                "net_worth": 0,
                "message": "No accounts found"
            }

        accounts_data = []
        total_balance = 0

        for account in accounts:
            try:
                balance = self.account_service.calculate_balance(
                    self.db, self.user_id, account.id
                )
                accounts_data.append({
                    "id": account.id,
                    "name": account.name,
                    "type": account.type,
                    "currency": account.currency,
                    "balance": balance,
                    "is_active": account.is_active
                })
                total_balance += balance
            except ValueError as e:
                logger.warning(f"Could not calculate balance for account {account.id}: {e}")

        return {
            "success": True,
            "count": len(accounts_data),
            "net_worth": total_balance,
            "accounts": accounts_data
        }

    def _create_goal(self, params: dict[str, Any]) -> dict[str, Any]:
        """Parse goal creation parameters and return for confirmation.

        This is a mutation tool - it returns the parsed parameters for user confirmation.

        Args:
            params: Tool parameters (years, target_amount, start_date)

        Returns:
            Parsed goal parameters for confirmation
        """
        years = params.get("years")
        target_amount = params.get("target_amount")
        start_date = params.get("start_date", date.today().isoformat())

        # Validate required fields
        if not years or years not in [1, 3, 5, 10]:
            return {"error": "validation", "message": "Goal years must be 1, 3, 5, or 10"}
        if not target_amount or target_amount <= 0:
            return {"error": "validation", "message": "Target amount must be positive"}

        # Check if goal already exists for this year horizon
        existing_goal = self.goal_service.get_goal_by_years(self.db, self.user_id, years)
        if existing_goal:
            return {
                "error": "validation",
                "message": f"You already have a {years}-year goal. Please update or delete the existing goal first."
            }

        # Return parsed parameters for confirmation
        return {
            "requires_confirmation": True,
            "tool": "create_goal",
            "payload": {
                "years": years,
                "target_amount": int(target_amount),
                "start_date": start_date
            }
        }

    def _update_budget(self, params: dict[str, Any]) -> dict[str, Any]:
        """Parse budget update parameters and return for confirmation.

        This is a mutation tool - it returns the parsed parameters for user confirmation.

        Args:
            params: Tool parameters (category, amount)

        Returns:
            Parsed budget update parameters for confirmation
        """
        category = params.get("category")
        amount = params.get("amount")

        # Validate required fields
        if not category:
            return {"error": "validation", "message": "Category is required"}
        if not amount or amount < 0:
            return {"error": "validation", "message": "Amount must be non-negative"}

        # Get current budget
        current_month = date.today().strftime("%Y-%m")
        budget = self.db.query(Budget).filter(
            Budget.user_id == self.user_id,
            Budget.month == current_month,
            Budget.is_active == True
        ).first()

        if not budget:
            return {
                "error": "validation",
                "message": "No active budget found for current month"
            }

        # Check if category exists in budget
        allocation_exists = any(
            alloc.category == category for alloc in budget.allocations
        )

        if not allocation_exists:
            return {
                "error": "validation",
                "message": f"Category '{category}' not found in current budget"
            }

        # Return parsed parameters for confirmation
        return {
            "requires_confirmation": True,
            "tool": "update_budget",
            "payload": {
                "category": category,
                "amount": int(amount),
                "month": current_month
            }
        }

    def _execute_create_goal(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Execute goal creation after user confirmation.

        Args:
            payload: Goal data

        Returns:
            Created goal result
        """
        try:
            # Parse start_date
            start_date_str = payload.get("start_date", date.today().isoformat())
            goal_start_date = date.fromisoformat(start_date_str)

            # Create goal
            goal = self.goal_service.create_goal(
                db=self.db,
                goal_data={
                    "user_id": self.user_id,
                    "years": payload["years"],
                    "target_amount": payload["target_amount"],
                    "start_date": goal_start_date
                }
            )

            return {
                "success": True,
                "goal_id": goal.id,
                "message": f"{payload['years']}-year goal created with target ¥{payload['target_amount']:,}"
            }
        except Exception as e:
            logger.error(f"Failed to create goal: {e}", exc_info=True)
            return {
                "success": False,
                "error": "execution",
                "message": f"Failed to create goal: {str(e)}"
            }

    def _execute_update_budget(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Execute budget update after user confirmation.

        Args:
            payload: Budget update data

        Returns:
            Update result
        """
        try:
            # Get current budget
            budget = self.db.query(Budget).filter(
                Budget.user_id == self.user_id,
                Budget.month == payload["month"],
                Budget.is_active == True
            ).first()

            if not budget:
                return {
                    "success": False,
                    "error": "execution",
                    "message": "Budget no longer exists"
                }

            # Update the allocation
            updated = False
            for alloc in budget.allocations:
                if alloc.category == payload["category"]:
                    old_amount = alloc.amount
                    alloc.amount = payload["amount"]
                    updated = True
                    break

            if not updated:
                return {
                    "success": False,
                    "error": "execution",
                    "message": f"Category '{payload['category']}' not found"
                }

            self.db.commit()

            return {
                "success": True,
                "message": f"Budget for {payload['category']} updated to ¥{payload['amount']:,}"
            }
        except Exception as e:
            logger.error(f"Failed to update budget: {e}", exc_info=True)
            self.db.rollback()
            return {
                "success": False,
                "error": "execution",
                "message": f"Failed to update budget: {str(e)}"
            }
