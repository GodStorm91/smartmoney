"""The read-only SmartMoney tools exposed to OpenClaw.

Each tool is a thin pass-through to an existing backend endpoint — NO financial
computation happens here (all currency conversion, budget math, achievability,
etc. already live in the backend). Docstrings become the tool descriptions the
agent sees, so they state what each returns. Amounts are integer minor units in
the account's currency; the backend's base currency is JPY.
"""
from fastmcp import FastMCP

from ..backend_client import backend_get


async def get_budget_suggestions() -> dict:
    """Get last month's budget shape as guidance for setting this month's budget.

    Useful when the user asks to set or adjust a budget. Returns previous
    allocations, monthly income, and carry-over context, or a no-prior-budget
    indicator when the user has never had a budget.
    """
    return await backend_get("/api/budgets/suggestions")


def register_read_tools(mcp: FastMCP) -> None:
    """Attach all read tools to the given FastMCP instance."""

    @mcp.tool()
    async def get_net_worth(month: str | None = None) -> dict:
        """Net worth + this month's income/expense/net summary.

        month: optional YYYY-MM (defaults to current month).
        """
        return await backend_get("/api/dashboard/summary", {"month": month})

    @mcp.tool()
    async def get_transactions(
        start_date: str | None = None,
        end_date: str | None = None,
        categories: str | None = None,
        source: str | None = None,
        is_income: bool | None = None,
        is_transfer: bool | None = None,
        account_id: int | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """List transactions with optional filters.

        Dates are YYYY-MM-DD. categories is comma-separated. limit max 1000.
        Returns {transactions, total, limit, offset}.
        """
        return await backend_get(
            "/api/transactions/",
            {
                "start_date": start_date,
                "end_date": end_date,
                "categories": categories,
                "source": source,
                "is_income": is_income,
                "is_transfer": is_transfer,
                "account_id": account_id,
                "limit": limit,
                "offset": offset,
            },
        )

    @mcp.tool()
    async def get_monthly_cashflow(
        start_date: str | None = None, end_date: str | None = None
    ) -> list:
        """Per-month income/expense/net series (for trend questions).

        Optional YYYY-MM-DD bounds; defaults to a recent window.
        """
        return await backend_get(
            "/api/analytics/monthly", {"start_date": start_date, "end_date": end_date}
        )

    @mcp.tool()
    async def get_budget_status(month: str | None = None) -> dict:
        """Current-month budget: per-category allocated vs spent, with status.

        month: optional YYYY-MM (defaults to current).
        """
        return await backend_get("/api/budgets/tracking/current", {"month": month})

    @mcp.tool()
    async def get_goals(trend_months: int = 3) -> list:
        """All financial goals, each enriched with its progress + achievability.

        trend_months (1-24): window used for the achievability projection.
        """
        goals = await backend_get("/api/goals/")
        if not isinstance(goals, list):
            return goals
        enriched = []
        for goal in goals:
            gid = goal.get("id")
            if gid is None:
                enriched.append(goal)
                continue
            progress = await backend_get(
                f"/api/goals/{gid}/progress",
                {"include_achievability": True, "trend_months": trend_months},
            )
            enriched.append({**goal, "progress": progress})
        return enriched

    @mcp.tool()
    async def get_insights(limit: int = 10, unread_only: bool = False) -> list:
        """Proactive financial insights (anomalies, trends, recommendations).

        limit max 50.
        """
        return await backend_get(
            "/api/insights", {"limit": limit, "unread_only": unread_only}
        )

    @mcp.tool()
    async def get_health_score() -> dict:
        """Financial health score (0-100) + component breakdown."""
        return await backend_get("/api/health-score")

    @mcp.tool()
    async def get_spending_by_category(
        start_date: str | None = None, end_date: str | None = None
    ) -> list:
        """Spending grouped by category with amount + percentage share.

        Optional YYYY-MM-DD bounds; defaults to current month.
        """
        return await backend_get(
            "/api/analytics/categories", {"start_date": start_date, "end_date": end_date}
        )

    @mcp.tool()
    async def get_cashflow_forecast(months: int = 6) -> dict:
        """Projected income/expense/balance for the next N months (1-24)."""
        return await backend_get("/api/analytics/forecast", {"months": months})

    @mcp.tool()
    async def evaluate_purchase(
        price: int,
        category: str,
        item_name: str | None = None,
    ) -> dict:
        """Decide if a planned purchase fits the user's current budget for that category.

        Returns deterministic verdict (go/tight/stop/unknown) + numeric context:
        allocated, spent_so_far, remaining_before/after, 3-month avg, days until month-end,
        and a 1-line reasoning string.

        price: planned purchase amount (yen).
        category: budget category to check against (e.g. "Food", "Shopping").
          If the category has no budget allocation, verdict will be "unknown" but the
          3-month average is still returned as guidance.
        item_name: optional — what you're buying (for user-visible context, not used in
          verdict math).

        Use this BEFORE confirming a purchase decision so the user has structured data
        instead of LLM-guessed budget math.
        """
        return await backend_get(
            "/api/budgets/evaluate-purchase",
            {"price": price, "category": category, "item_name": item_name},
        )

    mcp.tool()(get_budget_suggestions)
