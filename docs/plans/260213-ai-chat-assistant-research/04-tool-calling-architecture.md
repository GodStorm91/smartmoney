# Tool Calling Architecture
**Date:** 2026-02-13

---

## Overview

Tool calling enables Claude to execute structured actions (create transactions, fetch data, update budgets) based on user requests.

## Architecture Pattern

```
User: "Add ¥5800 Starbucks coffee"
    ↓
Claude API (with tools) → Identifies: create_transaction tool
    ↓
Tool Call Response: {"tool": "create_transaction", "params": {"description": "Starbucks coffee", "amount": 5800, "category": "Food"}}
    ↓
Backend executes tool → Creates transaction in DB
    ↓
Result returned to Claude → "Transaction created successfully"
    ↓
Claude final response → "I've added ¥5,800 for Starbucks coffee to your Food expenses."
```

---

## Tool Definition Format

### Structure

```python
{
    "name": "create_transaction",
    "description": "Create a new financial transaction in the user's account",
    "input_schema": {
        "type": "object",
        "properties": {
            "description": {
                "type": "string",
                "description": "Transaction description (e.g., 'Starbucks coffee')"
            },
            "amount": {
                "type": "number",
                "description": "Amount in yen (positive for income, negative for expenses)"
            },
            "category": {
                "type": "string",
                "description": "Category name from user's available categories"
            },
            "date": {
                "type": "string",
                "format": "date",
                "description": "Transaction date in YYYY-MM-DD format (defaults to today)"
            }
        },
        "required": ["description", "amount", "category"]
    },
    "strict": true  # Enforce exact schema match (2026 feature)
}
```

### Best Practices

1. **Descriptive Names:** Use verb_noun pattern (`create_transaction`, `get_budget`)
2. **Clear Descriptions:** Explain what tool does and when to use it
3. **Property Descriptions:** Help Claude choose correct parameters
4. **Required Fields:** Mark only truly required fields
5. **Strict Mode:** Always set `strict: true` for production

---

## Tool Catalog for SmartMoney

### Read-Only Tools (No Confirmation)

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `get_transactions` | Fetch recent transactions | days (30-90) | Transaction list |
| `get_budget` | Fetch current budget | - | Budget allocations |
| `get_goals` | Fetch financial goals | - | Goal list with progress |
| `analyze_spending` | Category breakdown | period (week/month/year) | Spending analysis |
| `get_financial_summary` | Overall snapshot | - | Income/expenses/net/savings |

### Mutation Tools (Require Confirmation)

| Tool | Description | Parameters | Confirmation Required |
|------|-------------|------------|----------------------|
| `create_transaction` | Add new transaction | description, amount, category, date | ✅ Yes |
| `update_budget` | Modify budget allocation | category, new_limit | ✅ Yes |
| `create_goal` | Add new financial goal | goal_type, target_amount, years, name | ✅ Yes |
| `delete_transaction` | Remove transaction | transaction_id | ✅ Yes |
| `update_transaction` | Edit existing transaction | transaction_id, fields | ✅ Yes |

---

## Confirmation Pattern

### Flow

1. Claude identifies mutation tool needed
2. Backend returns tool call to frontend (doesn't execute yet)
3. Frontend displays `ActionCard` with parameters preview
4. User clicks "Apply" or "Skip"
5. If "Apply": Execute tool + return result to Claude
6. Claude generates confirmation message

### Implementation

**Backend response:**
```json
{
  "message": "I found a transaction to create. Please confirm:",
  "suggested_action": {
    "type": "create_transaction",
    "payload": {
      "description": "Starbucks coffee",
      "amount": 5800,
      "category": "Food",
      "date": "2026-02-13"
    },
    "description": "Add ¥5,800 expense in Food category"
  }
}
```

**Frontend `ActionCard` component:**
```tsx
<div className="action-card">
  <h4>Suggested Action</h4>
  <p>{action.description}</p>
  <pre>{JSON.stringify(action.payload, null, 2)}</pre>
  <button onClick={() => onApply()}>Apply</button>
  <button onClick={() => onSkip()}>Skip</button>
</div>
```

---

## Tool Execution Layer

### Service Class Pattern

```python
class ToolExecutor:
    """Execute tools with validation and logging."""

    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        self.transaction_service = TransactionService(db)
        self.budget_service = BudgetService(db)
        self.goal_service = GoalService(db)

    async def execute(self, tool_name: str, params: dict) -> dict:
        """Execute tool with policy checks."""
        # Validate user access
        if not self._check_permissions(tool_name, params):
            raise PermissionError(f"Unauthorized: {tool_name}")

        # Route to appropriate service
        if tool_name == "create_transaction":
            return await self._create_transaction(params)
        elif tool_name == "get_transactions":
            return await self._get_transactions(params)
        # ... more tools

    def _check_permissions(self, tool_name: str, params: dict) -> bool:
        """Verify user has permission for tool + params."""
        # Row-level security check
        if "transaction_id" in params:
            tx = self.db.query(Transaction).get(params["transaction_id"])
            if tx.user_id != self.user_id:
                return False
        return True

    async def _create_transaction(self, params: dict) -> dict:
        """Create transaction via service."""
        transaction = self.transaction_service.create_transaction(
            user_id=self.user_id,
            description=params["description"],
            amount=params["amount"],
            category=params["category"],
            date=params.get("date"),
        )
        return {"success": True, "transaction_id": transaction.id}
```

---

## Context Building

### Financial Context for Claude

```python
def build_financial_context(db: Session, user_id: int, days: int = 30) -> str:
    """Build context summary for Claude."""

    # Fetch data
    transactions = get_recent_transactions(db, user_id, days)
    budget = get_budget(db, user_id)
    goals = get_goals(db, user_id)

    # Summarize transactions
    total_income = sum(t.amount for t in transactions if t.is_income)
    total_expenses = sum(abs(t.amount) for t in transactions if not t.is_income)
    top_categories = get_top_spending_categories(transactions, limit=5)

    context = f"""FINANCIAL CONTEXT (Last {days} days):

SUMMARY:
- Total Income: ¥{total_income:,}
- Total Expenses: ¥{total_expenses:,}
- Net Cashflow: ¥{total_income - total_expenses:,}
- Transaction Count: {len(transactions)}

TOP SPENDING CATEGORIES:
{chr(10).join(f"- {cat['name']}: ¥{cat['total']:,} ({cat['count']} transactions)" for cat in top_categories)}

BUDGET STATUS:
{chr(10).join(f"- {alloc.category}: ¥{alloc.spent:,} / ¥{alloc.limit:,} ({alloc.percentage}%)" for alloc in budget.allocations)}

GOALS:
{chr(10).join(f"- {goal.name}: ¥{goal.current_amount:,} / ¥{goal.target_amount:,} ({goal.progress_percentage}%)" for goal in goals)}
"""
    return context
```

---

## Parallel Tool Calling

### Use Case

User: "Show my budget and recent expenses"

Claude can call both tools simultaneously:
```json
[
  {"tool": "get_budget", "params": {}},
  {"tool": "get_transactions", "params": {"days": 30}}
]
```

### Implementation

```python
# Claude API supports parallel tool use natively
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    messages=messages,
    tools=tool_definitions,
    max_tokens=2048
)

# Response may contain multiple tool_use blocks
for block in response.content:
    if block.type == "tool_use":
        # Execute each tool
        result = await executor.execute(block.name, block.input)
        tool_results.append({"tool_use_id": block.id, "content": result})

# Send all results back to Claude in one API call
final_response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    messages=messages + [
        {"role": "assistant", "content": response.content},
        {"role": "user", "content": tool_results}
    ]
)
```

---

## Error Handling

### Validation Errors

```python
try:
    result = executor.execute(tool_name, params)
except ValidationError as e:
    # Return error to Claude, let it rephrase or ask for clarification
    return {"error": "validation", "message": str(e)}
except PermissionError as e:
    return {"error": "permission", "message": "Unauthorized access"}
except Exception as e:
    # Log unexpected errors
    logger.error(f"Tool execution failed: {tool_name}", exc_info=e)
    return {"error": "execution", "message": "Internal error"}
```

### User-Friendly Error Messages

Claude can convert technical errors to natural language:
```
Tool result: {"error": "validation", "message": "Category 'Groceries' not found"}
Claude response: "I couldn't find a category called 'Groceries' in your budget. Your available categories are: Food, Transportation, Housing, Entertainment. Did you mean 'Food'?"
```

---

## Testing Strategy

### Unit Tests

```python
def test_create_transaction_tool():
    executor = ToolExecutor(db, user_id=1)
    result = await executor.execute("create_transaction", {
        "description": "Test expense",
        "amount": 1000,
        "category": "Food",
        "date": "2026-02-13"
    })
    assert result["success"] is True
    assert "transaction_id" in result

def test_unauthorized_delete():
    executor = ToolExecutor(db, user_id=1)
    with pytest.raises(PermissionError):
        await executor.execute("delete_transaction", {
            "transaction_id": 999  # Belongs to user_id=2
        })
```

### Integration Tests

```python
def test_full_tool_calling_flow():
    messages = [{"role": "user", "content": "Add ¥5000 coffee"}]
    response = chat_service.chat_with_context(db, user_id=1, messages)

    assert response["message"]  # Claude response
    assert response["suggested_action"]["type"] == "create_transaction"
    assert response["suggested_action"]["payload"]["amount"] == 5000
```

---

## Performance Optimization

### Caching Tool Definitions

```python
# Load once at startup, not per request
TOOL_DEFINITIONS = load_tool_definitions()

@lru_cache(maxsize=1)
def get_tool_definitions() -> list[dict]:
    return TOOL_DEFINITIONS
```

### Batch Data Fetching

```python
# Fetch all context data in parallel
async def build_context_parallel(db, user_id):
    transactions, budget, goals = await asyncio.gather(
        get_transactions_async(db, user_id),
        get_budget_async(db, user_id),
        get_goals_async(db, user_id)
    )
    return format_context(transactions, budget, goals)
```

---

## References

- [Claude Tool Use Implementation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use)
- [Best Practices for Function Calling](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Programmatic Tool Calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
