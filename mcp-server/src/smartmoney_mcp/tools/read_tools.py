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


async def get_wallets() -> list:
    """List the user's tracked crypto wallets (id, address, label, chain).

    Use this FIRST when the user asks about DeFi/LPs/portfolio so you know
    which wallet IDs to query. Empty list = user hasn't added any wallets yet
    (direct them to the web UI Settings -> Wallets to add one).
    """
    return await backend_get("/api/crypto/wallets")


async def get_wallet_portfolio(wallet_id: int) -> dict:
    """Full portfolio summary for a single wallet (tokens + total value).

    wallet_id: from get_wallets().
    Returns native + ERC20 token balances with USD values, totals, chain breakdown.
    """
    return await backend_get(f"/api/crypto/wallets/{wallet_id}/portfolio")


async def get_defi_positions(wallet_id: int) -> dict:
    """DeFi positions (LPs, lending, staking, etc.) for a single wallet.

    Protocol-agnostic. Backend uses Zerion API which identifies positions by
    contract regardless of which DEX/protocol they belong to.

    wallet_id: from get_wallets(). Returns positions with type, protocol, chain,
    underlying tokens, USD value, position_id (use for get_position_history).
    """
    return await backend_get(f"/api/crypto/wallets/{wallet_id}/defi-positions")


async def get_unclaimed_rewards() -> list:
    """All unclaimed reward claims across the user's wallets, in one call.

    Single aggregated read. No wallet_id needed. Returns claims with source
    contract, reward token, amount, USD value, claim URL/instructions.
    """
    return await backend_get("/api/crypto/claims")


async def get_position_history(position_id: str, days: int = 30) -> dict:
    """Historical value of a single DeFi position over the last N days.

    position_id: opaque identifier from get_defi_positions() output. May change
      after a re-sync; re-fetch positions first if the ID is stale.
    days: lookback window. Backend supports a fixed enum: 7, 30, 90, or 365.
      Any other value silently coerces to 30 — pass one of those four to be sure.

    Returns time-series of position value (USD) so the agent can describe trends.
    """
    return await backend_get(
        f"/api/crypto/positions/{position_id}/history",
        {"days": days},
    )


async def get_merkl_rewards(wallet_id: int, chain: str = "base") -> dict:
    """Merkl LP incentive rewards for a wallet on a given chain.

    Merkl distributes LP incentives such as AERO on Aerodrome or extra rewards
    on Uniswap V3 pools. This is separate from `get_unclaimed_rewards`, which
    aggregates other reward sources.

    wallet_id: from get_wallets().
    chain: "base" (default) or "polygon". Other chains not yet supported.

    Returns {tokens, chain, wallet_address} with breakdown per reward token.
    """
    return await backend_get(
        f"/api/crypto/wallets/{wallet_id}/merkl-rewards",
        {"chain": chain},
    )


async def get_wallet_performance(wallet_id: int) -> dict:
    """Wallet-level aggregated DeFi position performance.

    Returns {total_value_usd, total_change_7d_usd, total_change_30d_usd,
    positions, snapshot_count, first_snapshot_date}.

    IMPORTANT: change values are 30-DAY DELTAS, not since-deposit P&L.
    Cost basis for open positions is NOT tracked yet. When the user asks
    "how much did I make total?" on an open position, tell them this is a
    rolling 30-day window. For TRUE realized P&L on EXITED positions, use
    get_closed_positions instead.
    """
    return await backend_get(f"/api/crypto/wallets/{wallet_id}/performance")


async def get_position_performance(position_id: str) -> dict:
    """Per-position open-state performance metrics.

    position_id: opaque identifier from get_defi_positions().

    Same caveat as get_wallet_performance: returns rolling 30-day P&L, NOT
    since-deposit. For closed positions' realized P&L, use get_closed_positions.
    """
    return await backend_get(f"/api/crypto/positions/{position_id}/performance")


async def get_position_insights(position_id: str) -> dict:
    """Per-position insights including HODL counterfactual.

    Returns LP-vs-HODL comparison, APY analysis, and recommendations.
    Useful for "was this LP a good investment?" questions.

    Caveat: cost-basis P&L is not tracked for open positions. HODL comparison
    is anchored on snapshot data, typically a 30-day window, not since-deposit.
    """
    return await backend_get(f"/api/crypto/positions/{position_id}/insights")


async def get_il_scenarios() -> list:
    """Impermanent loss scenarios for various price-change scenarios.

    Returns IL curves such as "if ETH +50%, IL = X%". Educational tool, likely
    generic curves rather than per-user-position data.

    Use when the user asks about IL concepts or "what's my IL risk if X happens".
    """
    return await backend_get("/api/crypto/il/scenarios")


async def get_closed_positions(wallet_id: int | None = None, limit: int = 50) -> list:
    """Realized P&L on positions you've CLOSED: the cleanest real-earnings answer.

    Each closure has cost_basis_usd, exit_value_usd, total_rewards_usd, and
    realized_pnl_usd (= exit + rewards - cost_basis).

    wallet_id: optional, filter to a single wallet (omit = all user's wallets).
    limit: max closures to return (1-200; default 50, most recent first).

    Returns list of {position_id, protocol, symbol, chain_id, exit_date,
    cost_basis_usd, exit_value_usd, total_rewards_usd, realized_pnl_usd,
    exit_tx_hash, note, data_completeness}.

    data_completeness "full" means cost_basis was recorded and realized_pnl is
    accurate. "partial" means cost_basis is null; tell the user realized P&L is
    unavailable for that closure before quoting it.
    """
    params = {"limit": limit}
    if wallet_id is not None:
        params["wallet_id"] = wallet_id
    return await backend_get("/api/crypto/closed-positions", params)


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
    mcp.tool()(get_wallets)
    mcp.tool()(get_wallet_portfolio)
    mcp.tool()(get_defi_positions)
    mcp.tool()(get_unclaimed_rewards)
    mcp.tool()(get_position_history)
    mcp.tool()(get_merkl_rewards)
    mcp.tool()(get_wallet_performance)
    mcp.tool()(get_position_performance)
    mcp.tool()(get_position_insights)
    mcp.tool()(get_il_scenarios)
    mcp.tool()(get_closed_positions)
