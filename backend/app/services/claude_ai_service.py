"""Claude AI service for budget generation and goal suggestions."""
import json
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from anthropic import Anthropic
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..config import settings
from ..models.transaction import Transaction
from ..models.goal import Goal
from ..models.account import Account
from ..models.budget import Budget
import re


class ClaudeAIService:
    """Service for Claude AI integration."""

    def __init__(self):
        """Initialize Claude AI client."""
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-haiku-20241022"

    def _get_spending_summary(
        self,
        db: Session,
        user_id: int,
        days: int
    ) -> dict[str, dict]:
        """Get aggregated spending by category for given time period.

        Args:
            db: Database session
            user_id: User ID
            days: Number of days to look back

        Returns:
            Dict mapping category to {average_monthly, transaction_count}
        """
        cutoff_date = date.today() - timedelta(days=days)
        months = Decimal(days) / Decimal(30)  # Approximate months for averaging

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
                Transaction.date >= cutoff_date
            )
            .group_by(Transaction.category)
            .all()
        )

        category_spending = {}
        for row in spending_data:
            avg_monthly = abs(row.total) / months
            category_spending[row.category] = {
                "average_monthly": int(avg_monthly),
                "transaction_count": row.count
            }

        return category_spending

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
        # Fetch spending data for both timeframes
        recent_spending = self._get_spending_summary(db, user_id, days=90)   # 3 months
        annual_spending = self._get_spending_summary(db, user_id, days=365)  # 12 months

        # Build prompt for Claude
        prompt = self._build_budget_prompt(
            monthly_income=monthly_income,
            recent_spending=recent_spending,
            annual_spending=annual_spending,
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
        # Fetch spending data for both timeframes
        recent_spending = self._get_spending_summary(db, user_id, days=90)   # 3 months
        annual_spending = self._get_spending_summary(db, user_id, days=365)  # 12 months

        # Build prompt for Claude
        prompt = self._build_budget_prompt(
            monthly_income=monthly_income,
            recent_spending=recent_spending,
            annual_spending=annual_spending,
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
        recent_spending: dict[str, dict],
        annual_spending: dict[str, dict],
        feedback: str | None,
        language: str = "ja"
    ) -> str:
        """Build prompt for Claude AI.

        Args:
            monthly_income: Monthly income in cents
            recent_spending: Last 3 months spending by category (current habits)
            annual_spending: Last 12 months spending by category (seasonal patterns)
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

        # Format recent spending (3 months - current habits)
        recent_str = "\n".join([
            f"  - {cat}: ¥{data['average_monthly']:,}/month ({data['transaction_count']} txns)"
            for cat, data in recent_spending.items()
        ]) if recent_spending else "  No recent data"

        # Format annual spending (12 months - seasonal patterns)
        annual_str = "\n".join([
            f"  - {cat}: ¥{data['average_monthly']:,}/month ({data['transaction_count']} txns)"
            for cat, data in annual_spending.items()
        ]) if annual_spending else "  No annual data"

        # System category names - MUST use these exact names for budget tracking
        system_categories = "Food, Housing, Transportation, Entertainment, Shopping, Health, Communication, Other"

        prompt = f"""You are a personal finance advisor helping create a monthly budget.

INCOME: {income_display}/month

RECENT SPENDING (last 3 months - reflects current habits):
{recent_str}

ANNUAL SPENDING (last 12 months - captures seasonal patterns):
{annual_str}

{'USER FEEDBACK: ' + feedback if feedback else ''}

AVAILABLE BUDGET CATEGORIES (you MUST use these exact English names):
{system_categories}

ANALYSIS GUIDANCE:
- Use RECENT spending to understand current lifestyle and immediate priorities
- Use ANNUAL spending to identify seasonal expenses (holidays, vacations, insurance)
- If a category appears only in annual data, it may be periodic/seasonal
- If recent spending differs significantly from annual, note the trend

TASK: Create a realistic, balanced monthly budget that:
1. Allocates funds across relevant expense categories
2. Recommends a reasonable savings target (20-30% of income if possible)
3. Considers both recent habits AND seasonal patterns
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
- CRITICAL: Category names MUST be exactly one of: {system_categories}
- Use Japanese Yen (¥) as currency
- All amounts must be integers (no decimals)
- Total allocations + savings should not exceed income
- Include 5-8 categories maximum (only use relevant ones)
- Write "reasoning" and "advice" fields in {language_name} language
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

    def categorize_transactions(
        self,
        transactions: list[dict],
        available_categories: list[str] | dict[str, list[str]],
        language: str = "ja"
    ) -> tuple[list[dict], dict[str, int]]:
        """Categorize transactions using Claude AI.

        Args:
            transactions: List of dicts with id, description, amount
            available_categories: Either flat list of category names OR
                                  dict mapping parent -> list of children for hierarchy
            language: Language code for response

        Returns:
            Tuple of (categorization results, usage dict with tokens)
        """
        if not transactions:
            return [], {"input_tokens": 0, "output_tokens": 0}

        # Build prompt for Claude - detect if hierarchical
        if isinstance(available_categories, dict):
            prompt = self._build_hierarchical_categorization_prompt(
                transactions=transactions,
                category_hierarchy=available_categories,
                language=language
            )
        else:
            prompt = self._build_categorization_prompt(
                transactions=transactions,
                available_categories=available_categories,
                language=language
            )

        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=0.3,  # Lower temp for more consistent categorization
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extract token usage
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        # Parse response
        results = self._parse_categorization_response(response.content[0].text)
        return results, usage

    def _build_categorization_prompt(
        self,
        transactions: list[dict],
        available_categories: list[str],
        language: str = "ja"
    ) -> str:
        """Build prompt for transaction categorization."""
        language_map = {
            "ja": "Japanese",
            "en": "English",
            "vi": "Vietnamese"
        }
        language_name = language_map.get(language, "Japanese")

        # Format transactions list
        tx_list = "\n".join([
            f'{i+1}. ID:{tx["id"]} | "{tx["description"]}" | ¥{abs(tx["amount"]):,}'
            for i, tx in enumerate(transactions)
        ])

        categories_str = ", ".join(available_categories)

        prompt = f"""You are a financial transaction categorizer. Analyze each transaction description and assign the most appropriate category.

AVAILABLE CATEGORIES (you MUST use one of these, or suggest a new one if none fit):
{categories_str}

TRANSACTIONS TO CATEGORIZE:
{tx_list}

TASK: For each transaction, determine the best category based on the description.
- Match merchant names, keywords, and context clues
- Use the most specific category that applies
- If no existing category fits well, suggest "NEW:CategoryName" format
- Be consistent with similar transactions

REQUIRED OUTPUT FORMAT (JSON array):
[
  {{"id": 123, "category": "Food", "confidence": 0.95, "reason": "Restaurant name detected"}},
  {{"id": 456, "category": "Transportation", "confidence": 0.85, "reason": "Train station keyword"}},
  {{"id": 789, "category": "NEW:Subscription", "confidence": 0.80, "reason": "Monthly recurring service fee"}}
]

RULES:
- Return ONLY valid JSON array
- Include all transaction IDs from input
- confidence should be 0.0-1.0
- reason should be brief (under 50 chars)
- Respond in {language_name} for the reason field

Generate categorizations now:"""

        return prompt

    def _build_hierarchical_categorization_prompt(
        self,
        transactions: list[dict],
        category_hierarchy: dict[str, list[str]],
        language: str = "ja"
    ) -> str:
        """Build prompt for hierarchical transaction categorization."""
        language_map = {
            "ja": "Japanese",
            "en": "English",
            "vi": "Vietnamese"
        }
        language_name = language_map.get(language, "Japanese")

        # Format transactions list
        tx_list = "\n".join([
            f'{i+1}. ID:{tx["id"]} | "{tx["description"]}" | ¥{abs(tx["amount"]):,}'
            for i, tx in enumerate(transactions)
        ])

        # Build hierarchy string
        hierarchy_lines = []
        for parent, children in category_hierarchy.items():
            children_str = ", ".join(children)
            hierarchy_lines.append(f"- {parent}: {children_str}")
        hierarchy_str = "\n".join(hierarchy_lines)

        prompt = f"""You are a financial transaction categorizer. Analyze each transaction and suggest the most appropriate CHILD category.

CATEGORY HIERARCHY (Parent: Children):
{hierarchy_str}

TRANSACTIONS TO CATEGORIZE:
{tx_list}

TASK: For each transaction, determine the best CHILD category based on the description.
- Always return a CHILD category (not parent)
- Match merchant names, keywords, and context clues
- If unsure, use "Misc" child under the most likely parent
- For new/unique items, suggest "NEW:CategoryName" under appropriate parent

REQUIRED OUTPUT FORMAT (JSON array):
[
  {{"id": 123, "category": "Cafe", "parent": "Food", "confidence": 0.95, "reason": "Starbucks detected"}},
  {{"id": 456, "category": "Train", "parent": "Transportation", "confidence": 0.85, "reason": "Station keyword"}},
  {{"id": 789, "category": "NEW:Gym", "parent": "Health", "confidence": 0.80, "reason": "Fitness facility"}}
]

RULES:
- Return ONLY valid JSON array
- Include all transaction IDs from input
- category = child category name
- parent = parent category name
- confidence should be 0.0-1.0
- reason should be brief (under 50 chars)
- Respond in {language_name} for the reason field

Generate categorizations now:"""

        return prompt

    def _parse_categorization_response(self, response_text: str) -> list[dict]:
        """Parse Claude's categorization response."""
        # Extract JSON from response
        start_idx = response_text.find("[")
        end_idx = response_text.rfind("]") + 1

        if start_idx == -1 or end_idx == 0:
            raise ValueError("No valid JSON array found in Claude response")

        json_str = response_text[start_idx:end_idx]
        results = json.loads(json_str)

        # Validate structure
        if not isinstance(results, list):
            raise ValueError("Invalid categorization format: expected array")

        for item in results:
            if "id" not in item or "category" not in item:
                raise ValueError("Invalid categorization item: missing id or category")

        return results

    def generate_goal_suggestion(
        self,
        db: Session,
        user_id: int,
        goal_type: str,
        years: int,
        language: str = "ja"
    ) -> tuple[dict[str, Any], dict[str, int]]:
        """Generate goal target suggestion based on user's financial data.

        Args:
            db: Database session
            user_id: User ID
            goal_type: Type of goal (emergency_fund, home_down_payment, etc.)
            years: Goal timeline in years
            language: Language code for response

        Returns:
            Tuple of (suggestion dict, usage dict with tokens)
        """
        # Get financial summary
        monthly_income = self._get_monthly_income(db, user_id)
        monthly_expenses = self._get_monthly_expenses(db, user_id)
        monthly_net = monthly_income - monthly_expenses
        existing_goals = self._get_existing_goals_summary(db, user_id)

        prompt = self._build_goal_suggestion_prompt(
            goal_type=goal_type,
            years=years,
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            monthly_net=monthly_net,
            existing_goals=existing_goals,
            language=language
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            temperature=0.5,
            messages=[{"role": "user", "content": prompt}]
        )

        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        suggestion = self._parse_goal_suggestion_response(response.content[0].text)
        return suggestion, usage

    def _get_monthly_income(self, db: Session, user_id: int) -> int:
        """Get average monthly income for last 6 months."""
        cutoff = date.today() - timedelta(days=180)
        result = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.is_income == True,
            Transaction.is_transfer == False,
            Transaction.date >= cutoff
        ).scalar() or 0
        return int(abs(result) / 6)

    def _get_monthly_expenses(self, db: Session, user_id: int) -> int:
        """Get average monthly expenses for last 6 months."""
        cutoff = date.today() - timedelta(days=180)
        result = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.is_income == False,
            Transaction.is_transfer == False,
            Transaction.is_adjustment == False,
            Transaction.date >= cutoff
        ).scalar() or 0
        return int(abs(result) / 6)

    def _get_existing_goals_summary(self, db: Session, user_id: int) -> list[dict]:
        """Get summary of user's existing goals."""
        goals = db.query(Goal).filter(Goal.user_id == user_id).all()
        return [{"type": g.goal_type, "name": g.name, "target": g.target_amount, "years": g.years} for g in goals]

    def _build_goal_suggestion_prompt(
        self, goal_type: str, years: int, monthly_income: int,
        monthly_expenses: int, monthly_net: int, existing_goals: list[dict], language: str
    ) -> str:
        """Build prompt for goal suggestion."""
        lang_name = {"ja": "Japanese", "en": "English", "vi": "Vietnamese"}.get(language, "Japanese")
        goal_info = {
            "emergency_fund": "3-6 months of expenses",
            "home_down_payment": "10-20% of home price",
            "vacation_travel": "Travel fund", "vehicle": "Vehicle purchase",
            "education": "Education costs", "wedding": "Wedding expenses",
            "large_purchase": "Major purchase", "debt_payoff": "Debt repayment",
            "retirement": "Retirement savings", "investment": "Investment capital", "custom": "Custom"
        }
        existing_str = "\n".join([f"- {g['name'] or g['type']}: ¥{g['target']:,} ({g['years']}y)" for g in existing_goals]) or "None"

        return f"""Financial advisor: suggest realistic savings goal.

GOAL: {goal_type} ({goal_info.get(goal_type, 'Custom')}) | TIMELINE: {years} years

FINANCES: Income ¥{monthly_income:,}/mo | Expenses ¥{monthly_expenses:,}/mo | Net ¥{monthly_net:,}/mo

EXISTING GOALS:
{existing_str}

OUTPUT JSON:
{{"suggested_target": 500000, "monthly_required": 8333, "achievable": true, "advice": "Brief advice"}}

RULES: achievable=true if monthly_required <= 80% of net. Advice in {lang_name}. For emergency_fund, suggest 3-6x expenses."""

    def _parse_goal_suggestion_response(self, response_text: str) -> dict[str, Any]:
        """Parse goal suggestion response."""
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1
        if start_idx == -1 or end_idx == 0:
            raise ValueError("No valid JSON in response")
        return json.loads(response_text[start_idx:end_idx])

    def chat_with_context(
        self,
        db: Session,
        user_id: int,
        messages: list[dict],
        language: str = "ja"
    ) -> tuple[dict[str, Any], dict[str, int]]:
        """Chat with AI using user's financial context.

        Args:
            db: Database session
            user_id: User ID
            messages: List of chat messages with role and content
            language: Language code (ja, en, vi)

        Returns:
            Tuple of (response dict with message and optional action, usage dict)
        """
        # Build financial context
        context = self._build_financial_context(db, user_id)

        # Build system prompt
        system_prompt = self._build_chat_system_prompt(context, language)

        # Call Claude API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            temperature=0.7,
            system=system_prompt,
            messages=messages
        )

        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        }

        response_text = response.content[0].text

        # Parse action from response if present
        action = self._parse_chat_action(response_text)

        # Clean message (remove action tags)
        clean_message = self._clean_chat_message(response_text)

        return {"message": clean_message, "action": action}, usage

    def _build_financial_context(self, db: Session, user_id: int) -> dict:
        """Build lightweight financial context for chat."""
        # Get monthly summary
        monthly_income = self._get_monthly_income(db, user_id)
        monthly_expenses = self._get_monthly_expenses(db, user_id)
        monthly_net = monthly_income - monthly_expenses

        # Get account balances (use initial_balance as base)
        accounts = db.query(Account).filter(Account.user_id == user_id).all()
        total_balance = sum(a.initial_balance or 0 for a in accounts)

        # Get goals count
        goals_count = db.query(Goal).filter(Goal.user_id == user_id).count()

        # Check if budget exists
        has_budget = db.query(Budget).filter(Budget.user_id == user_id).first() is not None

        # Get top spending categories (current month)
        top_categories = self._get_top_categories(db, user_id, limit=5)

        return {
            "monthly_income": monthly_income,
            "monthly_expenses": monthly_expenses,
            "monthly_net": monthly_net,
            "total_balance": total_balance,
            "goals_count": goals_count,
            "has_budget": has_budget,
            "top_categories": top_categories
        }

    def _get_top_categories(self, db: Session, user_id: int, limit: int = 5) -> str:
        """Get top spending categories for current month."""
        cutoff = date.today().replace(day=1)
        results = (
            db.query(Transaction.category, func.sum(Transaction.amount).label("total"))
            .filter(
                Transaction.user_id == user_id,
                Transaction.is_income == False,
                Transaction.is_transfer == False,
                Transaction.date >= cutoff
            )
            .group_by(Transaction.category)
            .order_by(func.sum(Transaction.amount))
            .limit(limit)
            .all()
        )
        if not results:
            return "No spending data this month"
        return "\n".join([f"- {r.category}: ¥{abs(r.total):,}" for r in results])

    def _build_chat_system_prompt(self, context: dict, language: str) -> str:
        """Build system prompt for chat with financial context."""
        lang_name = {"ja": "Japanese", "en": "English", "vi": "Vietnamese"}.get(language, "Japanese")

        return f"""You are a helpful financial advisor assistant for SmartMoney app.
You help users understand their finances, create savings goals, and manage budgets.

USER'S FINANCIAL CONTEXT:
- Monthly Income: ¥{context['monthly_income']:,}
- Monthly Expenses: ¥{context['monthly_expenses']:,}
- Net Savings: ¥{context['monthly_net']:,}
- Total Balance: ¥{context['total_balance']:,}
- Active Goals: {context['goals_count']}
- Has Budget: {'Yes' if context['has_budget'] else 'No'}

Top Spending Categories (this month):
{context['top_categories']}

CAPABILITIES:
When you recommend creating a goal or budget, output an action block in this format:

<action type="create_goal">
{{"goal_type": "emergency_fund", "target_amount": 500000, "years": 1, "name": "Emergency Fund"}}
</action>

<action type="create_budget">
{{"monthly_income": 300000, "feedback": "Focus on reducing food spending"}}
</action>

RULES:
- Be concise and helpful (1-3 sentences per response)
- Use the user's financial data to give personalized advice
- Respond in {lang_name}
- Only suggest actions when explicitly asked or clearly appropriate
- For goal creation, suggest realistic targets based on their net savings
- For budgets, consider their spending patterns"""

    def _parse_chat_action(self, response_text: str) -> dict | None:
        """Parse action block from AI response."""
        # Match <action type="...">...</action>
        pattern = r'<action\s+type="([^"]+)">\s*(\{[^}]+\})\s*</action>'
        match = re.search(pattern, response_text, re.DOTALL)

        if not match:
            return None

        action_type = match.group(1)
        try:
            payload = json.loads(match.group(2))
        except json.JSONDecodeError:
            return None

        # Build description based on action type
        if action_type == "create_goal":
            desc = f"Create {payload.get('name', 'goal')}: ¥{payload.get('target_amount', 0):,}"
        elif action_type == "create_budget":
            desc = "Generate AI budget based on your spending"
        else:
            desc = "Apply suggested action"

        return {
            "type": action_type,
            "payload": payload,
            "description": desc
        }

    def _clean_chat_message(self, response_text: str) -> str:
        """Remove action blocks from response text."""
        pattern = r'<action\s+type="[^"]+">.*?</action>'
        cleaned = re.sub(pattern, '', response_text, flags=re.DOTALL)
        return cleaned.strip()
