# Phase 04 — Deploy + End-to-End Telegram Verification

## Context Links
- Overview: [plan.md](plan.md)
- Depends on: Phases 01, 02, 03 all complete + tests green

## Overview
- Date: 2026-05-31 | Priority: P1 | Impl status: DEPLOY DONE, USER VERIFY PENDING | Review status: DONE
- Deploy via existing `./deploy.sh` (proven from prior MCP plan); verify end-to-end through Telegram: user uploads PayPay CSV via chat → bot imports → reports counts.
- **Status:** Infrastructure deploy complete (backend + mcp-server rebuilt, migration applied, prod verification passed — get_net_worth call returned real data, ¥376,301 expense). User-driven Telegram E2E test pending (user generates write token in Settings → adds 2nd OpenClaw entry → DMs bot with PayPay CSV → expects created/skipped counts).

## Key Insights
- Same deploy mechanics as prior MCP plan worked cleanly. Migration is additive (nullable columns) → safe under live traffic.
- OpenClaw needs to know the user has a write token configured. Two surfaces:
  - **Server URL stays `?token=<read_token>`** — the read token. OpenClaw uses read tools.
  - For write operations, the agent needs the write token somewhere. Cleanest UX:
    - User has BOTH tokens. The MCP server URL only carries one (the read token, for tools/list discovery).
    - For `import_csv` tool calls, the WRITE token must be passed somehow.
    - **Options:**
      - (a) User configures TWO MCP server entries in OpenClaw — `smartmoney-read` and `smartmoney-write` — each with its own URL+token. Backend would expose 9 read tools on first, 1 import_csv tool on second. Awkward UX.
      - (b) User puts the write token in the URL, accepting it as "more privileged" — but then read tools also work with that token (since write tokens currently aren't accepted on read endpoints unless we explicitly add reads to the allowlist). Need to verify.
      - (c) **(Recommended)** Tool argument: `import_csv` takes the write token as an arg. User pastes it once when asking the bot to import. The agent extracts the token from the conversation and passes it. Eliminates the URL-token problem entirely for writes.
- **This is a NEW open question that emerged during planning** — needs user input before Phase 04 starts. Document here, escalate.

## Resolved: write-token-to-OpenClaw flow
**Option (a) — two MCP entries** in OpenClaw config:
- `smartmoney-read` → `https://money.khanh.page/mcp?token=<READ_TOKEN>` → tools/list surfaces 9 read tools only
- `smartmoney-write` → `https://money.khanh.page/mcp?token=<WRITE_TOKEN>` → tools/list surfaces ONLY `import_csv`

Tool surface filtering done in mcp-server middleware (see Phase 02 amendment). Backend remains sole auth authority.

## Requirements (assuming option (a) for now)
Functional:
- Code deployed to prod (backend + mcp-server containers rebuilt; nginx config unchanged)
- New backend tables/columns migrated
- User generates write token in Settings UI
- User adds 2nd OpenClaw MCP entry pointing at `https://money.khanh.page/mcp?token=<write_token>` (same URL, different token)
- User uploads CSV via Telegram → bot picks `import_csv` tool → bot replies with `{created, skipped, total_rows}` summary

Non-functional: 0 regression in existing 9 read tools.

## Architecture (deployment)

```
./deploy.sh on dev machine →
  rsync backend/, mcp-server/, deploy/ → prod
  ssh prod:
    alembic upgrade head  (applies add_mcp_write_jti_to_users migration)
    docker compose up -d --build backend mcp-server
    nginx -s reload  (or restart if needed; config unchanged this time)
  curl https://money.khanh.page/api/health → 200
  manual: tools/list against /mcp?token=<read_token> → still 9 read tools
  manual: tools/list against /mcp?token=<write_token> → 9 read + 1 import_csv (or whatever option chosen surfaces)
```

## Related Code Files
- No new code in this phase. Pure ops + verification.

## Implementation Steps
1. **Pre-flight on prod** — `ssh root@money.khanh.page` and verify gateway is responsive (`curl /api/health` 200; `/mcp` initialize returns server name).
2. **Run `./deploy.sh`** from local. Watch:
   - rsync success
   - `alembic upgrade head` output (confirm the new revision applied + no errors swallowed by the `|| true` in script — need to check logs manually)
   - container restart + log tail for any startup errors
3. **Migration verification:** `ssh root@money.khanh.page "docker exec smartmoney-db psql -U smartmoney -d smartmoney -c '\d users'"` → confirm `mcp_write_token_jti` + `mcp_write_token_created_at` columns exist
4. **Generate write token via prod Settings UI** (real browser, real account). Copy token.
5. **OpenClaw config update:** per chosen option from above question, wire write token.
6. **Telegram E2E test:**
   - Send small PayPay CSV (sanitized fixture) to bot
   - Verify bot reply contains `created: N, skipped: 0, total_rows: N`
   - Send same CSV again
   - Verify bot reply: `created: 0, skipped: N` (dedup via Transaction ID)
7. **Regression test:** Ask bot "what's my net worth?" → confirm read tool still works (no break in read flow)
8. **Verify logs**: `ssh root@money.khanh.page "docker logs --tail 50 smartmoney-mcp"` — no `mcp_write` token leaked in access logs (should still be off per earlier security work)

## Todo List
- [x] Resolve open question: write-token flow option (a) — two MCP entries with tool filtering by token type
- [x] Pre-flight prod health check
- [x] Run `./deploy.sh` and tail logs (watch for migration swallowed errors)
- [x] Verify migration applied in prod DB (mcp_write_token_jti + mcp_write_token_created_at present)
- [x] Prod verification: get_net_worth call returned real data (¥376,301 expense); no token leaks in logs
- [ ] Generate write token in prod Settings (user-driven)
- [ ] Configure OpenClaw per chosen option (user-driven)
- [ ] Telegram E2E: 1st upload → created==total (user-driven)
- [ ] Telegram E2E: 2nd upload (same CSV) → skipped==total (user-driven)
- [ ] Regression: read tool still works ("net worth" query) (user-driven)
- [ ] Log check: no token leak in mcp-server access log (user-driven)

## Success Criteria
- PayPay CSV imported via Telegram (real account, real prod)
- Dedup verified on re-upload
- 9 read tools still work (no regression)
- No token in any container log
- Backend `/api/health` returns 200 throughout

## Risks + Mitigations
- **Migration silently fails** (deploy.sh has `|| true` on alembic) → run migration verification step explicitly (step 3); halt if columns missing
- **OpenClaw doesn't surface `import_csv` to the agent** → check `openclaw mcp list` shows smartmoney; OpenClaw tools/list discovery happens on agent turn; verify via `openclaw logs --follow`
- **Telegram bot disabled by codex plugin issue** (per earlier session) → ensure `openclaw plugins disable codex` is still in effect on user's machine

## Next Steps
- Mark plan `status: completed` after success
- Write journal entry capturing: what worked, what surprised us (esp. write-token flow option chosen), Phase 2 prerequisites
- Optionally start Phase 2 plan (`evaluate_purchase`) — separate plan dir
