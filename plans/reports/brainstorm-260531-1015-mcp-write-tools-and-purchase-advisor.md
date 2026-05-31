---
title: "MCP Write Tools (CSV import) + Purchase Advisor"
type: brainstorm
date: 2026-05-31
status: design-approved
follow-up: pending /ck:plan
---

# MCP Write Tools (CSV import) + Purchase Advisor — Design Summary

## Problem

Current MCP server is read-only by explicit ruling (plan #6). User wants to extend it for:
1. CSV import via Telegram chat (PayPay first, more sources later)
2. Purchase advisor: send a URL, agent fetches it, checks budget, gives buy/no-buy verdict

Both cross the read-only boundary or require new tools. Need design that preserves security posture of long-lived (365d) MCP token.

## Approved Design — 4 Pieces, 2 Phases

### Piece 1 — Two-tier MCP tokens (backend + frontend)

- Existing 365d `mcp` token stays read-only (zero behavior change, no regression risk)
- New `mcp_write` token type, ~30d expiry, opt-in via Settings
- Backend `get_current_user` accepts `mcp_write` only on whitelisted write endpoints
- Whitelist starts with: CSV import endpoint (Phase 1), purchase-eval endpoint (Phase 2 — read-only actually, may not need write token)
- DB: add `users.mcp_write_token_jti VARCHAR(64) NULL` (mirror existing `mcp_token_jti`)
- Frontend Settings: second section "MCP Write Token" — generate / revoke / copy; clear UI distinction from read token (warning copy explaining short expiry + capabilities)

### Piece 2 — `import_csv` MCP tool

```python
async def import_csv(source: str, csv_base64: str) -> dict:
    """Import a CSV from a known source (e.g. 'paypay'). Returns import summary."""
```

- MCP server decodes base64 → POSTs multipart to existing backend CSV import endpoint
- Backend handles dedup via existing `tx_hash` mechanism (already idempotent)
- Returns shape: `{imported: n, duplicates_skipped: n, errors: [...]}`
- Auth errors mapped clearly: 401 → "write token revoked/expired", 403 → "this is a read token; generate a write token in Settings"

### Piece 3 — PayPay parser

- Investigate first: does existing Japanese CSV importer handle PayPay's column layout? (sample required from user)
- If not: add `source="paypay"` mapping in importer (header row → existing Transaction fields)
- Encoding likely Shift-JIS or UTF-8 BOM (per existing patterns)

### Piece 4 — `evaluate_purchase` MCP tool (Phase 2)

```python
async def evaluate_purchase(price: int, category: str, item_name: str | None = None) -> dict:
    """Check if a planned purchase fits the user's current budget for that category.
    Returns structured verdict incl. 3-month spend context."""
```

Returns:
```json
{
  "category": "Food",
  "allocated": 50000,
  "spent_so_far": 38000,
  "remaining_before": 12000,
  "remaining_after": 8500,
  "days_until_month_end": 9,
  "three_month_avg_in_category": 47000,
  "verdict": "go" | "tight" | "stop",
  "reasoning": "Within budget; pace consistent with 3-month average."
}
```

- Backend endpoint: `GET /api/budgets/evaluate-purchase?price=&category=` (read-only — does NOT need write token; uses existing read-only MCP token)
- Tool is read-only, fits existing token gate
- LLM still does URL fetch + price/category extraction; the MCP tool just does deterministic budget math

## Why Not Alternatives

| Considered | Rejected because |
|---|---|
| Lift read-only entirely for MCP tokens | Blast radius too big on 365d token; any leak = full account access |
| Per-tool allowlist on existing single token | Conflates "long-lived read" vs "operational write" lifecycles; can't rotate independently |
| Pure agent composition for piece 4 (no new tool) | Category-picking + budget math by LLM = inconsistent answers; deterministic = correct each time |
| Single-shot ship of all 4 pieces | Piece 1 is the riskiest (auth model change); ship + verify in isolation first |
| MCP resources mechanism for file transport | Uneven client support; OpenClaw support unknown; base64 inline is simpler + fits chat-native UX |

## Rollout Phases

**Phase 1: Import flow (pieces 1+2+3) — ~6–8h**
- Two-tier tokens land first
- CSV import tool wired
- PayPay format verified against real export
- Acceptance: user sends PayPay CSV via Telegram → bot imports → returns count + duplicate summary

**Phase 2: Purchase advisor (piece 4) — ~3h**
- Backend `evaluate-purchase` endpoint
- MCP `evaluate_purchase` tool
- Acceptance: user sends product URL via Telegram → agent fetches → calls tool → returns structured verdict

## Risks + Mitigations

| Risk | Mitigation |
|---|---|
| Write token leaks (still long-ish lived) | Shorter expiry (30d) + visible "active since" in Settings UI; one-click revoke |
| PayPay CSV format not parseable | Get sample from user BEFORE writing the importer mapping (gated) |
| Large CSV exceeds MCP message size | Inline base64 capped at ~5–10MB practical; PayPay monthly export is tiny (KBs); document the limit |
| LLM picks wrong category for purchase advisor | Tool signature requires explicit `category` arg; LLM must commit. Tool returns clear error on unknown category so LLM can retry |
| MCP server rebuild/redeploy needed | Container rebuild via existing `./deploy.sh` — same flow we already verified |
| Backend migration (`mcp_write_token_jti` column) | Alembic migration, additive only (nullable column); rollback = drop column |

## Success Metrics

- Phase 1: user successfully imports a real PayPay CSV via Telegram and sees imported transactions on the dashboard
- Phase 2: user pastes a product URL to the bot and gets a structured verdict referencing real budget numbers
- No regression in the 13 existing tests (3 backend + 10 mcp-server)
- New tests: integration tests for write-token gate, `import_csv` happy + error paths, `evaluate_purchase` with empty/full/over-budget scenarios

## Open Questions

1. PayPay CSV exact column layout — pending user-provided sample (header + 1 sanitized row)
2. Does the existing CSV importer handle one-pass dedupe across mixed-source imports, or per-source? (Affects whether PayPay imports could collide with prior bank imports of the same payment)
3. For `evaluate_purchase`, should we cap `category` to user's actually-configured categories, or accept free text + return "unknown category" error? (Recommend: validate against config; cleaner UX)
4. Write-token UX: separate "generate" button + warning copy, OR a toggle on the existing token to "upgrade" it to write? (Recommend: separate — clearer mental model + independent rotation)

## Next Step

User decides whether to invoke `/ck:plan` to generate the phased implementation plan for Phase 1 (pieces 1+2+3).
