---
title: "MCP Import Flow — Write tokens + import_csv tool + PayPay parser"
description: "Phase 1 of MCP write features: opt-in write-scoped token, single import_csv MCP tool, PayPay CSV parser via source-aware /api/upload/csv. Phase 2 (evaluate_purchase) deferred."
status: implemented
priority: P2
effort: 8h
branch: feat/mcp-server-openclaw
tags: [mcp, csv, paypay, auth, write-tokens, import]
created: 2026-05-31
blocks: []
blockedBy: []
supersedes: [plans/251223-1100-paypay-ocr-upload]
---

# MCP Import Flow

User wants to message OpenClaw bot with a PayPay CSV and have it imported. Requires
breaching the read-only boundary the original MCP plan drew — done via opt-in
write-scoped token (preserves long-lived read token's security posture).

## Context Links
- Brainstorm: [../reports/brainstorm-260531-1015-mcp-write-tools-and-purchase-advisor.md](../reports/brainstorm-260531-1015-mcp-write-tools-and-purchase-advisor.md)
- Scout: [reports/scout-codebase-context.md](reports/scout-codebase-context.md)
- Prior MCP plan (completed): [../260523-0756-smartmoney-mcp-server-openclaw/plan.md](../260523-0756-smartmoney-mcp-server-openclaw/plan.md)
- Superseded OCR plan: [../251223-1100-paypay-ocr-upload/plan.md](../251223-1100-paypay-ocr-upload/plan.md)

## Approved Design (from brainstorm)
1. **Two-tier MCP tokens** — existing 365d `mcp` read-token untouched; new `mcp_write` 30d opt-in token, backend per-endpoint allowlist gates which writes it can do
2. **`import_csv(source, csv_base64)` MCP tool** — single extensible tool; thin pass-through to backend `/api/upload/csv?source=...`
3. **PayPay parser** — new English-header parser variant + outgoing/incoming amount combiner + Transaction ID dedup key; selected via `source=paypay` query param

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 01 | Backend write-token tier (model + migration + auth + routes + frontend Settings UI) | DONE (9/9 tests pass, prod deployed) | 4h | [phase-01-write-token-tier.md](phase-01-write-token-tier.md) |
| 02 | MCP `import_csv` tool + `backend_post_multipart` helper + tests | DONE (19/19 mcp-server tests pass, prod deployed) | 1h | [phase-02-import-csv-tool.md](phase-02-import-csv-tool.md) |
| 03 | Backend PayPay CSV parser + `source=paypay` dispatch in upload route + tests | DONE (5 new + 10 regression tests pass, prod deployed) | 2h | [phase-03-paypay-csv-parser.md](phase-03-paypay-csv-parser.md) |
| 04 | Deploy + end-to-end Telegram verification | DEPLOY DONE, USER VERIFY PENDING | 1h | [phase-04-deploy-and-verify.md](phase-04-deploy-and-verify.md) |

**Dependency chain:** 01 → 02 (write token must exist before tool can be tested with real auth); 03 is parallel to 01+02 (different files). 04 depends on 01+02+03.

## Resolved Decisions
- **Write-token-to-OpenClaw flow:** Option (a) — TWO MCP entries (`smartmoney-read` + `smartmoney-write`). MCP server filters `tools/list` by inbound token type: read tokens see 9 read tools; write tokens see ONLY `import_csv`. Forces backend mcp-server to do per-request tool filtering (see Phase 02 amendment).

## Open Questions (resolve during implementation, not blockers)
1. **Should "Points, Balance Earned" rows be imported?** — Phase 3 decision; recommend opt-in via `include_points` param defaulting to false (tiny ¥1-60 noise rows)
2. **Cross-source dedup on Transaction ID** — Phase 3; recommend per-source dedup table column to avoid PayPay TX-ID colliding with hash-based dedup of other sources
3. **Write-token UI: separate component or section in McpTokenSection?** — Phase 1 decision; recommend new sibling `McpWriteTokenSection.tsx` for clear mental model

## Session Log

**2026-05-31 (completion)**
- Phase 01: write-token tier backend + Settings UI impl complete; 9/9 unit tests pass; deployed to prod; migration verified (mcp_write_token_jti + mcp_write_token_created_at columns present)
- Phase 02: import_csv MCP tool + token-type tool filter impl complete; 19/19 mcp-server tests pass; deployed to prod (manual Step 4.5 rerun due to deploy.sh `log_error` bug — non-critical, heredoc substitution issue)
- Phase 03: PayPay CSV parser + source dispatch impl complete; 5 new + 10 regression tests pass; deployed to prod backend
- M2 follow-up: backend 400 error detail surfacing sharpened in mcp-server/backend_client.py; 19/19 mcp-server tests still green
- Code review: full pass; no CRITICAL/HIGH findings (report: code-review-phases-01-03.md)
- Deploy verification: get_net_worth call on prod returned real data (¥376,301 expense); no token leaks in logs
- Phase 04 status: infrastructure deploy complete; user-driven Telegram E2E pending (user generates write token in Settings → adds 2nd OpenClaw entry → DMs bot with PayPay CSV → expects created/skipped counts)
- **Follow-up:** deploy.sh `log_error` bug (line uses undefined function inside SSH heredoc) — 2-line fix: replace `log_error` with inline `echo` statement

## File Inventory
NEW (backend):
- `backend/alembic/versions/<rev>_add_mcp_write_jti_to_users.py`
- `backend/app/utils/paypay_csv_parser.py`
- `backend/tests/test_mcp_write_token.py`
- `backend/tests/test_paypay_csv_parser.py`
- `backend/tests/fixtures/paypay_sample.csv` (small sanitized)

NEW (mcp-server):
- `mcp-server/src/smartmoney_mcp/tools/write_tools.py`
- `mcp-server/tests/test_import_csv.py`

NEW (frontend):
- `frontend/src/components/settings/McpWriteTokenSection.tsx`

MODIFIED:
- `backend/app/auth/utils.py` (add `create_mcp_write_token`)
- `backend/app/auth/dependencies.py` (accept `mcp_write` type + per-endpoint allowlist)
- `backend/app/models/user.py` (add `mcp_write_token_jti`, `mcp_write_token_created_at`)
- `backend/app/routes/mcp_token.py` (add `/api/auth/mcp-write-token` routes — mirror existing)
- `backend/app/routes/upload.py` (accept `source` query param, dispatch parser)
- `backend/app/schemas/mcp_token.py` (write-token schemas)
- `mcp-server/src/smartmoney_mcp/backend_client.py` (add `backend_post_multipart`)
- `mcp-server/src/smartmoney_mcp/tools/__init__.py` (register write tools)
- `mcp-server/src/smartmoney_mcp/server.py` (call register_write_tools)
- `frontend/src/services/mcp-token-service.ts` (add write-token fns)
- `frontend/src/pages/Settings.tsx` (mount McpWriteTokenSection)

DEPRECATED (cross-plan):
- `plans/251223-1100-paypay-ocr-upload/plan.md` (status → superseded)
