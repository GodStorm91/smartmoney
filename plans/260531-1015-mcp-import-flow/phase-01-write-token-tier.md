# Phase 01 — Backend MCP Write-Token Tier + Settings UI

## Context Links
- Overview: [plan.md](plan.md)
- Scout: [reports/scout-codebase-context.md](reports/scout-codebase-context.md) §3 (auth), §6 (migration), §7 (frontend)
- Existing pattern: [../260523-0756-smartmoney-mcp-server-openclaw/phase-01-backend-mcp-token-auth.md](../260523-0756-smartmoney-mcp-server-openclaw/phase-01-backend-mcp-token-auth.md)

## Overview
- Date: 2026-05-31 | Priority: P1 | Impl status: DONE | Review status: DONE
- Issue opt-in 30d `mcp_write` JWT (separate from existing 365d `mcp` read token). Gate writes via per-endpoint allowlist. Settings UI gets a sibling component for write-token lifecycle.
- Blocks Phase 02 (tool needs working write token to test end-to-end). Independent of Phase 03.
- **Status:** Implementation complete; 9/9 unit tests passing; deployed to prod; migration verified; Settings UI generating and revoking tokens successfully.

## Key Insights
- Existing `get_current_user` (`dependencies.py:17-59`) already handles `mcp` type with revocation + 403-on-write gate. Extend it: accept third type `mcp_write`; when type=`mcp_write`, check separate `mcp_write_token_jti` AND verify endpoint is in allowlist.
- **Allowlist must be a request-time check, not endpoint-decorated**, because it's the auth dep that has the request object. Use `request.url.path` against a small explicit set (just `/api/upload/csv` for now). Tightest possible blast radius.
- 30d expiry shorter than 365d read token → leaks have shorter half-life. Configurable via env default.
- Frontend: a NEW sibling component (not a tab inside existing one) makes the mental model clearer — "you have TWO token types, each with its own lifecycle".
- DB columns mirror existing pattern: `mcp_write_token_jti VARCHAR(64) NULL` + `mcp_write_token_created_at TIMESTAMP NULL`. Additive migration, rollback = drop columns.

## Requirements
Functional:
- POST `/api/auth/mcp-write-token` (uses access token) → mint write JWT, rotate jti, return `{token, created_at, expires_days}` ONCE
- DELETE `/api/auth/mcp-write-token` → clear jti (instant revoke)
- GET `/api/auth/mcp-write-token` → status `{enabled, created_at}` (NEVER returns token)
- `get_current_user` accepts `type ∈ {access, mcp, mcp_write}`; `mcp_write` allowed only on whitelisted endpoints (initial: `/api/upload/csv`)
- Existing read MCP token behavior UNCHANGED (regression-critical)

Non-functional: HS256 reuse, 30d default expiry, Settings UI warns clearly about write capabilities + shorter expiry.

## Architecture

Issue flow: Settings → POST mcp-write-token (access auth) → `jti=uuid4`, `create_mcp_write_token({sub, jti}, 30d)` → `user.mcp_write_token_jti = jti`, `mcp_write_token_created_at = now`, commit → return token (shown once, rotates prior).

Use flow: backend endpoint → `get_current_user` → decode → if type=`mcp_write`: verify `payload.jti == user.mcp_write_token_jti` AND `request.url.path in WRITE_TOKEN_ALLOWLIST`; else 401/403.

Revoke flow: DELETE → null both columns → all write tokens fail jti check.

## Related Code Files
Modify:
- `backend/app/auth/utils.py` — add `create_mcp_write_token(data, jti, expires_days=30)` setting `type:"mcp_write"`, `jti`
- `backend/app/auth/dependencies.py:17-59` — extend `get_current_user`:
  - accept `token_type in {"access","mcp","mcp_write"}`
  - when `mcp_write`: check `user.mcp_write_token_jti == payload.jti` (401 if mismatch); check `request.url.path in WRITE_TOKEN_ALLOWLIST` (403 if not)
  - keep existing `mcp` GET-only gate intact
  - define module-level `WRITE_TOKEN_ALLOWLIST = {"/api/upload/csv"}`
- `backend/app/models/user.py:41-42` — add `mcp_write_token_jti: Mapped[str|None] = mapped_column(String(64), nullable=True)`, `mcp_write_token_created_at: Mapped[datetime|None] = mapped_column(DateTime, nullable=True)`
- `backend/app/routes/mcp_token.py:19-64` — add 3 routes under prefix `/api/auth/mcp-write-token` mirroring existing (`issue_mcp_write_token`, `revoke_mcp_write_token`, `mcp_write_token_status`). Reuse `McpTokenResponse`/`McpTokenStatus` schemas or add `McpWriteTokenResponse` if `expires_days` differs.
- `backend/app/schemas/mcp_token.py` — if differing default, add `McpWriteTokenResponse(token, created_at, expires_days=30)`
- `frontend/src/services/mcp-token-service.ts` — add `fetchMcpWriteTokenStatus()`, `generateMcpWriteToken()`, `revokeMcpWriteToken()` (mirror existing 3 fns, different path)
- `frontend/src/pages/Settings.tsx` — mount `<McpWriteTokenSection />` below existing `<McpTokenSection />`

Create:
- `backend/alembic/versions/<rev>_add_mcp_write_jti_to_users.py` — additive nullable columns; down = drop
- `frontend/src/components/settings/McpWriteTokenSection.tsx` — mirror `McpTokenSection.tsx` structure, prominent amber warning copy:
  - "Write tokens allow imports and other write operations through MCP"
  - "Shorter expiry (30 days) — rotate when no longer needed"
  - "Treat like a password"
- `backend/tests/test_mcp_write_token.py` — see Tests below

## Implementation Steps
1. Add `mcp_write_token_jti` + `mcp_write_token_created_at` to `User` model.
2. Generate migration: `cd backend && uv run alembic revision -m "add mcp write jti to users"` → hand-edit `upgrade()` (2x `op.add_column`) and `downgrade()` (2x `op.drop_column`). Set `down_revision` to the current head (`a1b2c3d4e5f6`).
3. Add `create_mcp_write_token(data, jti, expires_days=30)` in `utils.py` (copy `create_mcp_token` pattern, set `type:"mcp_write"`).
4. Extend `get_current_user`:
   - Define `WRITE_TOKEN_ALLOWLIST = {"/api/upload/csv"}` at module top
   - Allow `token_type in {"access","mcp","mcp_write"}`
   - When `mcp_write`: verify jti, then `if request.url.path not in WRITE_TOKEN_ALLOWLIST: raise HTTPException(403, "Write token not allowed for this endpoint")`
5. Add 3 routes to `routes/mcp_token.py` (mirror existing patterns precisely, just swap `mcp_token_jti` → `mcp_write_token_jti` and call `create_mcp_write_token`).
6. Add schema response class if needed.
7. Frontend: clone `mcp-token-service.ts` functions with `-write` suffix; create `McpWriteTokenSection.tsx` (clone + amber warning + clear "Write Token" label); mount in Settings page.
8. Compile check: `cd backend && uv run python -c "import app.main"` + `cd frontend && npm run typecheck` (or build).

## Tests (`backend/tests/test_mcp_write_token.py`)
- `test_write_token_lifecycle` — issue (with access token) → 200 + token; GET status → enabled; revoke → 204; status → disabled
- `test_write_token_allowed_endpoint` — write token can POST `/api/upload/csv` (mock the actual upload to keep test fast)
- `test_write_token_blocked_on_non_allowlisted_endpoint` — write token gets 403 on e.g. DELETE `/api/transactions/{id}`
- `test_write_token_blocked_on_read_endpoint_when_revoked` — revoked write token gets 401
- `test_read_mcp_token_still_403_on_writes_regression` — sanity: existing `mcp` read token still blocks all writes (no regression in old behavior)
- `test_access_token_unaffected_by_write_token_changes_regression` — access token works on read + write as before

## Todo List
- [x] User model: add `mcp_write_token_jti` + `mcp_write_token_created_at`
- [x] Alembic migration (down_revision = `a1b2c3d4e5f6`)
- [x] `create_mcp_write_token` in auth/utils.py
- [x] `get_current_user` accepts `mcp_write` + WRITE_TOKEN_ALLOWLIST gate
- [x] 3 routes in routes/mcp_token.py (`/api/auth/mcp-write-token`)
- [x] Optional: `McpWriteTokenResponse` schema if expires_days defaults differ
- [x] frontend mcp-token-service: 3 new fns
- [x] frontend McpWriteTokenSection component
- [x] Mount in Settings.tsx
- [x] Write 6 backend tests
- [x] Run tests (`cd backend && uv run pytest tests/test_mcp_write_token.py tests/test_mcp_token.py -q`)
- [x] Frontend type-check + build

## Success Criteria
- All 6 new tests pass + existing `test_mcp_token.py` tests still pass (no regression)
- Frontend builds clean
- Manual: generate write token in Settings UI → token shown once → status shows enabled → revoke clears → status shows disabled
- Manual: curl `/api/upload/csv` with write token + a CSV → 200 (or 4xx from upload itself, not auth); curl any non-allowlisted POST with write token → 403

## Risks + Mitigations
- **Regression in `get_current_user` breaks ALL endpoints** → 6 tests above, including 2 explicit regression tests
- **Forgetting to add new endpoints to WRITE_TOKEN_ALLOWLIST** → fail closed: unknown endpoint → 403. Document the constant clearly.
- **Migration race in deploy** → use existing `deploy.sh` flow which runs `alembic upgrade head` (additive nullable columns safe to apply mid-traffic)

## Next Steps
- Once green: Phase 02 can begin (depends on a working write token to test against)
