"""Tests for chat service with tool calling."""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.models.budget import Budget, BudgetAllocation
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User
from app.services.chat_context_builder import build_financial_context, get_available_categories
from app.services.claude_ai_service import ClaudeAIService
from app.services.tool_executor import ToolExecutor
from app.utils.transaction_hasher import generate_tx_hash


@pytest.fixture
def sample_user(db_session: Session):
    """Create a sample user for testing."""
    user = User(
        email="test@example.com",
        hashed_password="hashed",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_transactions(db_session: Session, sample_user: User):
    """Create sample transactions for testing."""
    transactions = []
    today = date.today()

    # Create transactions over last 30 days
    for i in range(10):
        tx_date = today - timedelta(days=i)
        tx_hash = generate_tx_hash(
            tx_date.isoformat(),
            -1000 * (i + 1),
            f"Transaction {i}",
            "Card"
        )

        tx = Transaction(
            user_id=sample_user.id,
            date=tx_date,
            description=f"Transaction {i}",
            amount=-1000 * (i + 1),
            category="Food" if i % 2 == 0 else "Transportation",
            source="Card",
            is_income=False,
            is_transfer=False,
            currency="JPY",
            month_key=tx_date.strftime("%Y-%m"),
            tx_hash=tx_hash
        )
        db_session.add(tx)
        transactions.append(tx)

    # Add one income transaction
    income_date = today - timedelta(days=5)
    income_hash = generate_tx_hash(
        income_date.isoformat(),
        300000,
        "Salary",
        "Bank"
    )
    income_tx = Transaction(
        user_id=sample_user.id,
        date=income_date,
        description="Salary",
        amount=300000,
        category="Income",
        source="Bank",
        is_income=True,
        is_transfer=False,
        currency="JPY",
        month_key=income_date.strftime("%Y-%m"),
        tx_hash=income_hash
    )
    db_session.add(income_tx)
    transactions.append(income_tx)

    db_session.commit()
    return transactions


@pytest.fixture
def sample_budget(db_session: Session, sample_user: User):
    """Create a sample budget for testing."""
    current_month = date.today().strftime("%Y-%m")

    budget = Budget(
        user_id=sample_user.id,
        month=current_month,
        monthly_income=300000,
        savings_target=50000,
        version=1,
        is_active=True
    )
    db_session.add(budget)
    db_session.flush()

    # Add allocations
    allocations = [
        BudgetAllocation(
            budget_id=budget.id,
            category="Food",
            amount=50000,
            reasoning="Basic food expenses"
        ),
        BudgetAllocation(
            budget_id=budget.id,
            category="Transportation",
            amount=30000,
            reasoning="Commute and travel"
        )
    ]
    for alloc in allocations:
        db_session.add(alloc)

    db_session.commit()
    db_session.refresh(budget)
    return budget


@pytest.fixture
def sample_goals(db_session: Session, sample_user: User):
    """Create sample goals for testing."""
    goals = [
        Goal(
            user_id=sample_user.id,
            target_amount=1000000,
            years=1
        ),
        Goal(
            user_id=sample_user.id,
            target_amount=5000000,
            years=5
        )
    ]
    for goal in goals:
        db_session.add(goal)

    db_session.commit()
    return goals


class TestChatContextBuilder:
    """Tests for chat context builder."""

    def test_build_financial_context(
        self,
        db_session: Session,
        sample_user: User,
        sample_transactions,
        sample_budget,
        sample_goals
    ):
        """Test building financial context."""
        context = build_financial_context(db_session, sample_user.id, days=30)

        # Check context contains key information
        assert "FINANCIAL CONTEXT" in context
        assert "Total Income:" in context
        assert "Total Expenses:" in context
        assert "Net Cashflow:" in context
        assert "TOP SPENDING CATEGORIES:" in context
        assert "BUDGET STATUS" in context
        assert "FINANCIAL GOALS:" in context
        assert "RECENT TRANSACTIONS" in context

        # Check specific values
        assert "¥300,000" in context  # Income
        assert "Food" in context
        assert "Transportation" in context

    def test_get_available_categories(
        self,
        db_session: Session,
        sample_user: User,
        sample_transactions
    ):
        """Test getting available categories."""
        categories = get_available_categories(db_session, sample_user.id)

        assert len(categories) > 0
        assert "Food" in categories
        assert "Transportation" in categories
        assert "Income" in categories


class TestToolExecutor:
    """Tests for tool executor."""

    def test_get_transactions_tool(
        self,
        db_session: Session,
        sample_user: User,
        sample_transactions
    ):
        """Test get_transactions tool execution."""
        executor = ToolExecutor(db_session, sample_user.id)
        result = executor.execute("get_transactions", {"days": 30})

        assert result["success"] is True
        assert result["count"] > 0
        assert "total_income" in result
        assert "total_expenses" in result
        assert "transactions" in result
        assert len(result["transactions"]) > 0

    def test_get_transactions_with_category_filter(
        self,
        db_session: Session,
        sample_user: User,
        sample_transactions
    ):
        """Test get_transactions with category filter."""
        executor = ToolExecutor(db_session, sample_user.id)
        result = executor.execute("get_transactions", {"days": 30, "category": "Food"})

        assert result["success"] is True
        # All transactions should be Food category
        for tx in result["transactions"]:
            assert tx["category"] == "Food"

    def test_create_transaction_tool_returns_confirmation(
        self,
        db_session: Session,
        sample_user: User
    ):
        """Test create_transaction tool returns confirmation request."""
        executor = ToolExecutor(db_session, sample_user.id)
        result = executor.execute(
            "create_transaction",
            {
                "description": "Coffee at Starbucks",
                "amount": -580,
                "category": "Food",
                "date": "2026-02-13"
            }
        )

        assert result["requires_confirmation"] is True
        assert result["tool"] == "create_transaction"
        assert "payload" in result
        assert result["payload"]["description"] == "Coffee at Starbucks"
        assert result["payload"]["amount"] == -580
        assert result["payload"]["category"] == "Food"

    def test_create_transaction_validation_error(
        self,
        db_session: Session,
        sample_user: User
    ):
        """Test create_transaction with missing required fields."""
        executor = ToolExecutor(db_session, sample_user.id)
        result = executor.execute(
            "create_transaction",
            {
                "description": "Test"
                # Missing amount and category
            }
        )

        assert "error" in result
        assert result["error"] == "validation"

    def test_get_budget_tool(
        self,
        db_session: Session,
        sample_user: User,
        sample_budget
    ):
        """Test get_budget tool execution."""
        executor = ToolExecutor(db_session, sample_user.id)
        result = executor.execute("get_budget", {})

        assert result["success"] is True
        assert "month" in result
        assert "monthly_income" in result
        assert result["monthly_income"] == 300000
        assert "allocations" in result
        assert len(result["allocations"]) > 0

        # Check allocation structure
        alloc = result["allocations"][0]
        assert "category" in alloc
        assert "limit" in alloc
        assert "spent" in alloc
        assert "remaining" in alloc
        assert "percentage" in alloc

    def test_get_budget_no_budget_exists(
        self,
        db_session: Session,
        sample_user: User
    ):
        """Test get_budget when no budget exists."""
        executor = ToolExecutor(db_session, sample_user.id)
        result = executor.execute("get_budget", {})

        assert result["success"] is False
        assert "No active budget" in result["message"]

    def test_execute_confirmed_action_create_transaction(
        self,
        db_session: Session,
        sample_user: User
    ):
        """Test executing a confirmed transaction creation."""
        executor = ToolExecutor(db_session, sample_user.id)
        result = executor.execute_confirmed_action(
            "create_transaction",
            {
                "description": "Test Transaction",
                "amount": -1000,
                "category": "Food",
                "date": "2026-02-13",
                "is_income": False
            }
        )

        assert result["success"] is True
        assert "transaction_id" in result

        # Verify transaction was created
        tx = db_session.query(Transaction).filter(
            Transaction.id == result["transaction_id"]
        ).first()
        assert tx is not None
        assert tx.description == "Test Transaction"
        assert tx.amount == -1000
        assert tx.user_id == sample_user.id

    def test_unknown_tool_raises_error(
        self,
        db_session: Session,
        sample_user: User
    ):
        """Test that unknown tool raises ValueError."""
        executor = ToolExecutor(db_session, sample_user.id)

        with pytest.raises(ValueError, match="Unknown tool"):
            executor.execute("unknown_tool", {})


class TestClaudeAIServiceChat:
    """Tests for ClaudeAIService chat_with_context method."""

    @patch("app.services.claude_ai_service.Anthropic")
    def test_chat_with_context_simple_query(
        self,
        mock_anthropic,
        db_session: Session,
        sample_user: User,
        sample_transactions,
        sample_budget
    ):
        """Test chat with simple query (no tool use)."""
        # Mock Claude response
        mock_message = MagicMock()
        mock_message.content = [
            MagicMock(type="text", text="Your total spending this month is ¥55,000.")
        ]
        mock_message.usage = MagicMock(input_tokens=100, output_tokens=50)

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_message
        mock_anthropic.return_value = mock_client

        # Initialize service and call chat
        service = ClaudeAIService()
        messages = [{"role": "user", "content": "How much did I spend this month?"}]

        response_data, usage = service.chat_with_context(
            db=db_session,
            user_id=sample_user.id,
            messages=messages,
            language="en"
        )

        assert "message" in response_data
        assert response_data["message"] == "Your total spending this month is ¥55,000."
        assert usage["input_tokens"] == 100
        assert usage["output_tokens"] == 50

    @patch("app.services.claude_ai_service.Anthropic")
    def test_chat_with_context_tool_use(
        self,
        mock_anthropic,
        db_session: Session,
        sample_user: User,
        sample_transactions
    ):
        """Test chat with tool use (get_transactions)."""
        # Mock first response with tool use
        mock_tool_use = MagicMock(
            type="tool_use",
            id="tool_1",
            name="get_transactions",
            input={"days": 30}
        )
        mock_message_1 = MagicMock()
        mock_message_1.content = [mock_tool_use]
        mock_message_1.usage = MagicMock(input_tokens=100, output_tokens=50)

        # Mock second response with final answer
        mock_message_2 = MagicMock()
        mock_message_2.content = [
            MagicMock(type="text", text="You have 11 transactions in the last 30 days.")
        ]
        mock_message_2.usage = MagicMock(input_tokens=200, output_tokens=30)

        mock_client = MagicMock()
        mock_client.messages.create.side_effect = [mock_message_1, mock_message_2]
        mock_anthropic.return_value = mock_client

        # Initialize service and call chat
        service = ClaudeAIService()
        messages = [{"role": "user", "content": "Show my recent transactions"}]

        response_data, usage = service.chat_with_context(
            db=db_session,
            user_id=sample_user.id,
            messages=messages,
            language="en"
        )

        assert "message" in response_data
        assert usage["input_tokens"] == 300  # 100 + 200
        assert usage["output_tokens"] == 80  # 50 + 30

    @patch("app.services.claude_ai_service.Anthropic")
    def test_chat_with_context_mutation_tool(
        self,
        mock_anthropic,
        db_session: Session,
        sample_user: User
    ):
        """Test chat with mutation tool (create_transaction)."""
        # Mock response with create_transaction tool use
        mock_tool_use = MagicMock()
        mock_tool_use.type = "tool_use"
        mock_tool_use.id = "tool_1"
        mock_tool_use.name = "create_transaction"
        mock_tool_use.input = {
            "description": "Coffee",
            "amount": -580,
            "category": "Food",
            "date": "2026-02-13"
        }

        mock_text = MagicMock()
        mock_text.type = "text"
        mock_text.text = "I can add that transaction for you."

        mock_message = MagicMock()
        mock_message.content = [mock_text, mock_tool_use]
        mock_message.usage = MagicMock(input_tokens=100, output_tokens=50)

        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_message
        mock_anthropic.return_value = mock_client

        # Initialize service and call chat
        service = ClaudeAIService()
        messages = [{"role": "user", "content": "Add ¥580 coffee expense"}]

        response_data, usage = service.chat_with_context(
            db=db_session,
            user_id=sample_user.id,
            messages=messages,
            language="en"
        )

        assert "message" in response_data
        assert "action" in response_data
        assert response_data["action"]["type"] == "create_transaction"
        assert response_data["action"]["payload"]["amount"] == -580
        assert response_data["action"]["payload"]["category"] == "Food"
