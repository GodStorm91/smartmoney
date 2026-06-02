"""Write tools exposed to OpenClaw. Requires a Write MCP token (separate from read token).

Tools here trigger writes via backend endpoints whitelisted for the mcp_write token type.
Backend is sole auth authority — MCP only forwards.
"""
import base64

from fastmcp import FastMCP

from ..backend_client import (
    backend_patch_json,
    backend_post_json,
    backend_post_multipart,
    backend_put_json,
)


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


async def scan_receipt(
    image_base64: str,
    mime_type: str = "image/jpeg",
) -> dict:
    """Scan a receipt photo and extract structured transaction data via Claude Vision.

    Requires a Write MCP token (generate in Settings → MCP Write Token).
    Costs ~$0.005-0.02 per scan (Claude Haiku Vision API).

    Typically paired with `apply_receipt_scan`: call this first to parse the receipt,
    show the result (including warnings) to the user for confirmation/edits, then
    call `apply_receipt_scan` with the approved fields.

    image_base64: base64-encoded image bytes. Accepts plain base64 or data URL
      format (data:image/jpeg;base64,...). Practical size limit: ~7MB base64
      (Telegram compresses photos, so real-world images are well under this).
    mime_type: MIME type of the image (default "image/jpeg"). Also accepted:
      "image/png". Ignored if image_base64 is a data URL (type inferred from prefix).

    Returns {success: bool, data: {amount: int, date: str, merchant: str,
      category: str, confidence: {amount: float, date: float, merchant: float},
      warnings: [str, ...]}}. IMPORTANT: always surface `data.warnings` to the user
      — they explain low-confidence parses (e.g. "Amount unclear — blurry digit").
      Low-confidence fields should trigger a user confirmation step before applying.
    """
    return await backend_post_json(
        "/api/receipts/scan",
        {"image": image_base64, "media_type": mime_type},
    )


async def apply_receipt_scan(
    amount: int,
    date: str,
    merchant: str,
    category: str = "Other",
    is_income: bool = False,
    currency: str = "JPY",
) -> dict:
    """Create a SmartMoney transaction from confirmed receipt scan fields.

    Requires a Write MCP token. Stateless — does NOT require a Receipt DB row.
    Typically called after `scan_receipt` once the user has approved the parsed fields.

    If the same receipt data is submitted twice, the duplicate-detection hash
    (based on date + amount + merchant) will skip creation silently.

    amount: transaction amount in the smallest currency unit (e.g. yen, not sen).
      Use the value from `scan_receipt` data.amount, adjusted by the user if needed.
    date: transaction date in YYYY-MM-DD format (or ISO). Falls back to today on
      invalid input, so prefer passing the exact string from `scan_receipt` data.date.
    merchant: merchant/description name from the receipt (shown in transaction list).
    category: spending category (default "Other"). Use the suggestion from
      `scan_receipt` data.category or let the user pick.
    is_income: set True only if the receipt represents income (rare; default False).
    currency: ISO currency code (default "JPY"; override for foreign receipts).

    Returns {transaction_id, description, amount, date, category, source, is_income}.
    source will always be "Receipt".
    """
    return await backend_post_json(
        "/api/receipts/apply-scan",
        {
            "amount": amount,
            "date": date,
            "merchant": merchant,
            "category": category,
            "is_income": is_income,
            "currency": currency,
        },
    )


async def set_budget_allocations(
    allocations: list[dict],
) -> dict:
    """Set or update budget allocations for the current month.

    Requires a Write MCP token. Free (no AI cost).
    Auto-creates a current-month budget if none exists yet.

    allocations: list of {"category": str, "amount": int} dicts. Each entry
      sets or overwrites that category's allocation for the current month.
      Categories NOT in the list are LEFT UNTOUCHED. Use amount=0 to explicitly
      clear a category.

    Returns the updated budget and was_created=True when a new current-month
    budget was created.
    """
    return await backend_patch_json(
        "/api/budgets/current/allocations",
        {"allocations": allocations},
    )


async def ai_suggest_budget(
    monthly_income: int,
    feedback: str | None = None,
) -> dict:
    """Get an AI-proposed budget WITHOUT saving it.

    Requires a Write MCP token. Costs credits per call.
    Two-step pattern: call this to get a proposal, show the user, then call
    `set_budget_allocations` with the approved allocations to persist.

    monthly_income: expected monthly income in yen.
    feedback: optional natural-language guidance.

    Returns {allocations, reasoning, credits_used, monthly_income}.
    """
    return await backend_post_json(
        "/api/budgets/generate-preview",
        {"monthly_income": monthly_income, "feedback": feedback},
    )


async def set_position_cost_basis(
    position_id: str,
    amount_usd: float | None,
    note: str | None = None,
) -> dict:
    """Set or clear the manual USD cost basis for one DeFi LP position.

    Requires a Write MCP token. Use this when SmartMoney's snapshot-derived
    basis is approximate or missing and the user/agent has reconciled a better
    tx-by-tx basis.

    position_id: exact LP position id from `get_lp_real_pnl` or DeFi position
      tools.
    amount_usd: manual cost basis in USD. Pass null to clear the manual override
      and fall back to the oldest-snapshot derived basis.
    note: optional audit note, e.g. source transaction hash or reconciliation
      summary.

    Returns {position_id, manual_basis_usd, derived_basis_usd,
      effective_basis_usd, basis_source, note, updated_at}.
    """
    return await backend_put_json(
        "/api/crypto/positions/cost-basis",
        {
            "position_id": position_id,
            "manual_basis_usd": amount_usd,
            "note": note,
        },
    )


def register_write_tools(mcp: FastMCP) -> None:
    """Attach all write tools to the given FastMCP instance."""
    mcp.tool()(import_csv)
    mcp.tool()(ai_categorize_suggest)
    mcp.tool()(ai_categorize_apply)
    mcp.tool()(scan_receipt)
    mcp.tool()(apply_receipt_scan)
    mcp.tool()(set_budget_allocations)
    mcp.tool()(ai_suggest_budget)
    mcp.tool()(set_position_cost_basis)
