"""Write tools exposed to OpenClaw. Requires a Write MCP token (separate from read token).

Tools here trigger writes via backend endpoints whitelisted for the mcp_write token type.
Backend is sole auth authority — MCP only forwards.
"""
import base64

from fastmcp import FastMCP

from ..backend_client import backend_post_json, backend_post_multipart


async def import_csv(
    source: str,
    csv_base64: str,
    filename: str = "import.csv",
) -> dict:
    """Import a CSV of transactions from a known source into SmartMoney.

    Requires a Write MCP token (generate in Settings → MCP Write Token).

    source: one of {"paypay"} (more sources coming). Determines which parser to use.
    csv_base64: base64-encoded CSV bytes (UTF-8 or UTF-8-with-BOM both supported).
    filename: optional, for backend logging only (default "import.csv").

    Returns {filename, total_rows, created, skipped, message}.
    """
    try:
        csv_bytes = base64.b64decode(csv_base64)
    except Exception as e:
        raise ValueError(f"csv_base64 is not valid base64: {e}")
    return await backend_post_multipart(
        "/api/upload/csv",
        files={"file": (filename, csv_bytes, "text/csv")},
        params={"source": source},
    )


async def ai_categorize_suggest(
    limit: int = 50,
    language: str = "ja",
    scope: str = "all",
    month: str | None = None,
) -> dict:
    """Get AI-powered category suggestions for transactions currently labeled "Other".

    Requires a Write MCP token. **Costs credits** (~0.5 credits per ~50-row batch);
    surfaces a clear "insufficient credits" error if the account lacks balance.

    Pair this tool with `ai_categorize_apply`: review suggestions with the user,
    then call apply with the approved subset.

    limit: max transactions to analyze (1-100; default 50)
    language: "ja" or "en" — language for the suggestion reasoning text
    scope: "all" (default) for every "Other" transaction; "budget" to limit to
      transactions in a given month whose categories aren't covered by any
      active budget allocation
    month: required when scope == "budget"; format YYYY-MM

    Returns {suggestions: [{transaction_id, description, amount, current_category,
      suggested_category, confidence, reason, is_new_category}, ...],
      total_other_count, credits_used, new_categories_suggested}.
    """
    if scope == "budget":
        if not month:
            raise ValueError("month is required when scope='budget' (format YYYY-MM)")
        return await backend_post_json(
            "/api/ai/categorize/budget-suggestions",
            {"month": month, "limit": limit, "language": language},
        )
    if scope != "all":
        raise ValueError(f"scope must be 'all' or 'budget', got: {scope!r}")
    return await backend_post_json(
        "/api/ai/categorize/suggestions",
        {"limit": limit, "language": language},
    )


async def ai_categorize_apply(
    approved: list[dict],
    create_rules: bool = True,
) -> dict:
    """Apply AI-suggested categories to a set of approved transactions.

    Requires a Write MCP token. Modifies transactions in-place; optionally
    creates keyword rules so future imports match the same description→category.

    Typically called after `ai_categorize_suggest` once the user has approved
    which suggestions to keep.

    approved: list of {"transaction_id": <int>, "category": <str>} dicts. Use
      the transaction_id values from a prior `ai_categorize_suggest` result.
    create_rules: if True (default), auto-creates a keyword rule per unique
      description so the same description gets the same category next time.

    Returns {updated_count, rules_created, failed_ids}.
    """
    return await backend_post_json(
        "/api/ai/categorize/apply",
        {"approved": approved, "create_rules": create_rules},
    )


def register_write_tools(mcp: FastMCP) -> None:
    """Attach all write tools to the given FastMCP instance."""
    mcp.tool()(import_csv)
    mcp.tool()(ai_categorize_suggest)
    mcp.tool()(ai_categorize_apply)
