# SmartMoney MCP Server (OpenClaw, read-only)

Exposes 9 **read-only** SmartMoney finance tools to [OpenClaw](https://openclaw.ai)
over MCP `streamable-http`. OpenClaw runs on your laptop; this server runs on the
VPS (`money.khanh.page`) next to the backend and is reached over HTTPS.

```
OpenClaw (laptop) --streamable-http HTTPS ?token=--> nginx /mcp
   --> mcp-server:3000 (this) --http--> backend:8000 (FastAPI) --> Postgres
```

The server is a thin pass-through: it forwards the caller's token to the backend
on every call. The **backend is the sole auth authority** (signature, expiry, jti
revocation, and a read-only HTTP-method gate). This server never validates tokens
and performs no financial computation.

## Tools (all read-only)

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

## Setup

1. In SmartMoney → **Settings → MCP token**, click **Generate token**. Copy it
   (shown once).
2. Add to your OpenClaw config (`~/.config/openclaw/config.json5` or equivalent):

   ```json5
   {
     mcp: {
       servers: {
         smartmoney: {
           url: "https://money.khanh.page/mcp?token=YOUR_TOKEN_HERE",
           transport: "streamable-http"
         }
       }
     },
     tools: { sandbox: { tools: { alsoAllow: ["bundle-mcp"] } } }
   }
   ```
3. Restart OpenClaw. Ask it: *"What's my net worth this month?"* — it will call
   `smartmoney__get_net_worth`.

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

- **Read-only at the token layer.** MCP tokens are typed `mcp` and the backend
  rejects them on any non-GET/HEAD/OPTIONS request (403), so even a leaked token
  cannot mutate data.
- **Revocable.** One active token per user; Generate rotates, Revoke clears.
- **No access-log leakage.** `access_log off` on the nginx `/mcp` location **and**
  uvicorn `access_log` disabled in the MCP server (covers `docker logs`).
- **Public endpoint.** Optional hardening: add an nginx IP allowlist on `/mcp`
  if your laptop has a static IP.

## Deferred (future iterations)

- Write tools (`add_transaction`, `create_budget_from_previous`) — would require
  lifting the read-only method gate for a scoped token type.
- Multiple active tokens per user; per-tool scopes.

## Manual integration checklist (verify against real OpenClaw)

1. Generate token in Settings; paste config; restart OpenClaw.
2. Ask a read question → confirm a tool is called and returns live data.
3. Revoke in Settings → next OpenClaw call should fail with an auth message →
   regenerate → works again.
4. On the VPS, confirm the token does **not** appear in logs:
   `docker logs smartmoney-nginx 2>&1 | grep token=` (expect none) and
   `docker logs smartmoney-mcp 2>&1 | grep token=` (expect none).
