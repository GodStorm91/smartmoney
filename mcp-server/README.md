# SmartMoney MCP Server (OpenClaw, read + scoped write)

Exposes 22 **read** tools and 7 **scoped write** SmartMoney finance tools to
[OpenClaw](https://openclaw.ai) over MCP `streamable-http`. OpenClaw runs on your
laptop; this server runs on the VPS (`money.khanh.page`) next to the backend and
is reached over HTTPS.

```
OpenClaw (laptop) --streamable-http HTTPS ?token=--> nginx /mcp
   --> mcp-server:3000 (this) --http--> backend:8000 (FastAPI) --> Postgres
```

The server is a thin pass-through: it forwards the caller's token to the backend
on every call. The **backend is the sole auth authority** (signature, expiry, jti
revocation, read-token method gate, and write-token endpoint allowlist). This
server never validates tokens and performs no financial computation.

## Read Tools

| Tool | Backend endpoint |
|------|------------------|
| `get_net_worth` | `/api/dashboard/summary` |
| `get_transactions` | `/api/transactions/` |
| `get_monthly_cashflow` | `/api/analytics/monthly` |
| `get_budget_status` | `/api/budgets/tracking/current` |
| `get_goals` | `/api/goals/` (+ per-goal `/progress`) |
| `get_insights` | `/api/insights` |
| `get_health_score` | `/api/health-score` |
| `get_spending_by_category` | `/api/analytics/categories` |
| `get_cashflow_forecast` | `/api/analytics/forecast` |
| `evaluate_purchase` | `/api/budgets/evaluate-purchase` |
| `get_budget_suggestions` | `/api/budgets/suggestions` |
| `get_wallets` | `/api/crypto/wallets` |
| `get_wallet_portfolio` | `/api/crypto/wallets/{id}/portfolio` |
| `get_defi_positions` | `/api/crypto/wallets/{id}/defi-positions` |
| `get_unclaimed_rewards` | `/api/crypto/claims` |
| `get_position_history` | `/api/crypto/positions/{position_id}/history` |
| `get_merkl_rewards` | `/api/crypto/wallets/{id}/merkl-rewards` |
| `get_wallet_performance` | `/api/crypto/wallets/{id}/performance` |
| `get_position_performance` | `/api/crypto/positions/{position_id}/performance` |
| `get_position_insights` | `/api/crypto/positions/{position_id}/insights` |
| `get_il_scenarios` | `/api/crypto/il/scenarios` |
| `get_closed_positions` | `/api/crypto/closed-positions` |

## Write Tools

These require a separate MCP write token. The backend accepts that token only on
the allowlisted endpoints below.

| Tool | Backend endpoint |
|------|------------------|
| `import_csv` | `/api/upload/csv` |
| `ai_categorize_suggest` | `/api/ai/categorize/suggestions` or `/api/ai/categorize/budget-suggestions` |
| `ai_categorize_apply` | `/api/ai/categorize/apply` |
| `scan_receipt` | `/api/receipts/scan` |
| `apply_receipt_scan` | `/api/receipts/apply-scan` |
| `set_budget_allocations` | `/api/budgets/current/allocations` |
| `ai_suggest_budget` | `/api/budgets/generate-preview` |

## Setup

1. In SmartMoney -> **Settings -> MCP token**, click **Generate token** for read
   access. Copy it (shown once).
2. Optional: generate an **MCP Write Token** for scoped write tools.
3. Add one or both tokens to your OpenClaw config
   (`~/.config/openclaw/config.json5` or equivalent):

   ```json5
   {
     mcp: {
       servers: {
         "smartmoney-read": {
           url: "https://money.khanh.page/mcp?token=YOUR_READ_TOKEN_HERE",
           transport: "streamable-http"
         },
         "smartmoney-write": {
           url: "https://money.khanh.page/mcp?token=YOUR_WRITE_TOKEN_HERE",
           transport: "streamable-http"
         }
       }
     },
     tools: { sandbox: { tools: { alsoAllow: ["bundle-mcp"] } } }
   }
   ```
4. Restart OpenClaw. Ask it: *"What's my net worth this month?"* — it will call
   `smartmoney-read__get_net_worth`.

### Why the token is in the URL, not a header

OpenClaw's streamable-http client currently drops custom headers
([openclaw#65590](https://github.com/openclaw/openclaw/issues/65590)), so an
`Authorization: Bearer` header would be lost. The token therefore rides in
`?token=`. This is safe in transit (HTTPS). The token is kept out of **both**
log layers: nginx has `access_log off` on `/mcp`, and the MCP server disables
its own uvicorn access log (otherwise `GET /mcp?token=…` would land in
`docker logs smartmoney-mcp`). A header (`Authorization: Bearer …`) is also
accepted as a fallback for clients that forward it.

Note: nginx's global `error_log` could still record the request URI (with
`?token=`) on an upstream *error* (timeout, rate-limit reject). Low likelihood;
if you ship logs off-host, consider scoping/stripping it.

The handshake quirk where OpenClaw opens a GET SSE stream before POST initialize
([openclaw#72757](https://github.com/openclaw/openclaw/issues/72757)) is handled —
the server never returns 405 on `/mcp` GET.

## Local development

```bash
cd mcp-server
uv sync
BACKEND_URL=http://localhost:8000 uv run smartmoney-mcp   # serves http://0.0.0.0:3000/mcp
```

Env (see `.env.example`): `BACKEND_URL`, `MCP_HOST`, `MCP_PORT`, `MCP_PATH`,
`BACKEND_TIMEOUT`. No `SECRET_KEY` needed — tokens are validated by the backend.

## Security posture

- **Read token stays read-only.** MCP read tokens are typed `mcp` and the backend
  rejects them on any non-GET/HEAD/OPTIONS request (403), so even a leaked read
  token cannot mutate data.
- **Write token is allowlisted.** MCP write tokens are typed `mcp_write`; the
  backend accepts them only on explicitly allowlisted endpoints.
- **Revocable.** One active read token and one active write token per user;
  Generate rotates, Revoke clears.
- **No access-log leakage.** `access_log off` on the nginx `/mcp` location **and**
  uvicorn `access_log` disabled in the MCP server (covers `docker logs`).
- **Public endpoint.** Optional hardening: add an nginx IP allowlist on `/mcp`
  if your laptop has a static IP.

## Deferred (future iterations)

- Multiple active tokens per user; per-tool scopes.
- Additional write tools such as `add_transaction` and `create_budget_from_previous`.

## Manual integration checklist (verify against real OpenClaw)

1. Generate read and write tokens in Settings; paste config; restart OpenClaw.
2. Ask a read question -> confirm a read tool is called and returns live data.
3. Ask a write-token question such as *"Set my Food budget to ¥50k"* -> confirm
   `set_budget_allocations` runs and the UI reflects the change.
4. Revoke in Settings -> next OpenClaw call should fail with an auth message ->
   regenerate -> works again.
5. On the VPS, confirm the token does **not** appear in logs:
   `docker logs smartmoney-nginx 2>&1 | grep token=` (expect none) and
   `docker logs smartmoney-mcp 2>&1 | grep token=` (expect none).
