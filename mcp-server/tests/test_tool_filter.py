"""Tests for token-type-based tools/list filtering.

Verifies that filter_tools_by_token_type correctly narrows the tool surface:
  - read token (type="mcp")       → strips all write tools, keeps read tools
  - write token (type="mcp_write") → keeps ONLY write tools
  - missing/invalid token          → returns unchanged list (fail-open)
"""
import base64
import json

import pytest

from smartmoney_mcp.tool_filter import filter_tools_by_token_type


def _make_jwt(payload: dict) -> str:
    """Build a minimal unsigned JWT (header.payload.signature) for testing."""
    header = base64.urlsafe_b64encode(b'{"alg":"none"}').rstrip(b"=").decode()
    body = base64.urlsafe_b64encode(
        json.dumps(payload).encode()
    ).rstrip(b"=").decode()
    return f"{header}.{body}."


class _FakeTool:
    """Minimal stand-in for fastmcp Tool objects."""

    def __init__(self, name: str):
        self.name = name


def _make_tools(*names: str) -> list[_FakeTool]:
    return [_FakeTool(n) for n in names]


READ_TOOL_NAMES = [
    "get_net_worth",
    "get_transactions",
    "get_monthly_cashflow",
    "get_budget_status",
    "get_goals",
    "get_insights",
    "get_health_score",
    "get_spending_by_category",
    "get_cashflow_forecast",
    "evaluate_purchase",
    "get_budget_suggestions",
    "get_wallets",
    "get_wallet_portfolio",
    "get_defi_positions",
    "get_unclaimed_rewards",
    "get_position_history",
    "get_merkl_rewards",
    "get_wallet_performance",
    "get_position_performance",
    "get_position_insights",
    "get_il_scenarios",
    "get_closed_positions",
    "get_lp_real_pnl",
]

WRITE_TOOL_NAMES = [
    "import_csv",
    "ai_categorize_suggest",
    "ai_categorize_apply",
    "scan_receipt",
    "apply_receipt_scan",
    "set_budget_allocations",
    "ai_suggest_budget",
    "set_position_cost_basis",
]
ALL_TOOLS = _make_tools(*READ_TOOL_NAMES, *WRITE_TOOL_NAMES)  # 31 total


def test_read_token_strips_all_write_tools():
    token = _make_jwt({"type": "mcp", "sub": "user-1"})
    result = filter_tools_by_token_type(ALL_TOOLS, token)
    names = [t.name for t in result]
    for write_name in WRITE_TOOL_NAMES:
        assert write_name not in names
    assert len(names) == 23
    for read_name in READ_TOOL_NAMES:
        assert read_name in names


def test_write_token_keeps_only_write_tools():
    token = _make_jwt({"type": "mcp_write", "sub": "user-1"})
    result = filter_tools_by_token_type(ALL_TOOLS, token)
    names = sorted(t.name for t in result)
    assert names == sorted(WRITE_TOOL_NAMES)


def test_missing_or_invalid_token_returns_unchanged_list():
    # None token
    result_none = filter_tools_by_token_type(ALL_TOOLS, None)
    assert [t.name for t in result_none] == [t.name for t in ALL_TOOLS]

    # Malformed token (not decodable)
    result_bad = filter_tools_by_token_type(ALL_TOOLS, "not.a.jwt")
    assert [t.name for t in result_bad] == [t.name for t in ALL_TOOLS]

    # Valid JWT but unknown type claim
    token_unknown = _make_jwt({"type": "access", "sub": "user-1"})
    result_unknown = filter_tools_by_token_type(ALL_TOOLS, token_unknown)
    assert [t.name for t in result_unknown] == [t.name for t in ALL_TOOLS]
