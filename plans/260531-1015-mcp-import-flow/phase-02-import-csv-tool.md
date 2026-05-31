# Phase 02 — MCP `import_csv` Tool + `backend_post_multipart` Helper

## Context Links
- Overview: [plan.md](plan.md)
- Scout: [reports/scout-codebase-context.md](reports/scout-codebase-context.md) §4 (tool layout), §1 (upload endpoint)
- Depends on: Phase 01 (write token must exist for real auth flow)

## Overview
- Date: 2026-05-31 | Priority: P1 | Impl status: DONE | Review status: DONE
- Add ONE write tool to the MCP server: `import_csv(source, csv_base64) → dict`. Pass-through to backend `/api/upload/csv?source=...`. Surfaces auth errors clearly so user knows when they're using the wrong token type.
- **Status:** Implementation complete; 19/19 mcp-server tests passing (6 new + 13 existing); tool filter by token type working (read tokens see 9 tools, write tokens see only import_csv); deployed to prod.

## Key Insights
- Existing `backend_get()` (`backend_client.py:45-68`) handles auth extraction + error mapping. Pattern to copy.
- Multipart upload from MCP: decode base64 → wrap as `httpx.AsyncClient.post(files={"file": (filename, bytes, "text/csv")}, params={"source": source})`
- Token gets forwarded as `Authorization: Bearer` (same as read tools). The backend differentiates read-vs-write tokens via `type` JWT claim — MCP server stays dumb.
- Error mapping needs to be sharper than read tools because user can confuse read vs write tokens:
  - 401 → "Write MCP token revoked or expired. Generate a new one in Settings."
  - 403 → **"This is a read-only MCP token. Generate a Write token in Settings → MCP Write Token section."** (distinguish from generic 403)
  - 422 → backend parse error: surface the detail (helps user fix CSV)
- Tool docstring is what the agent sees → must guide it (when to call, what args mean, expected source values)

## Requirements
Functional:
- `register_write_tools(mcp: FastMCP)` registers `import_csv`
- `import_csv(source: str, csv_base64: str, filename: str = "import.csv") → dict`
- Decodes base64, POSTs multipart with `source` query param, returns backend response shape
- Auth errors clearly distinguish read-token-vs-write-token confusion

Non-functional: keep tool count separate (read vs write modules) for clarity; no shared state.

## Architecture

```
agent.tool_call("import_csv", {source:"paypay", csv_base64:"..."})
  → register_write_tools.import_csv(...)
      → _extract_token() (same as read tools)
      → base64.b64decode(csv_base64)
      → backend_post_multipart("/api/upload/csv",
            params={"source":"paypay"},
            files={"file":(filename, bytes, "text/csv")},
            token=<from request>)
      → 200 → return resp.json()
      → 401 → AuthError("write token revoked/expired")
      → 403 → AuthError("this is a read-only token; generate a write token in Settings")
      → 422 → AuthError or RuntimeError with backend detail (parse error)
      → 5xx → RuntimeError (generic, no topology leak)
```

## Related Code Files
Modify:
- `mcp-server/src/smartmoney_mcp/backend_client.py` — add `async def backend_post_multipart(path, files, params=None) → dict`:
  - reuse `_extract_token()` (already module-level)
  - same `httpx.AsyncClient(base_url=BACKEND_URL, timeout=BACKEND_TIMEOUT)` pattern
  - `client.post(path, params=_clean(params), files=files, headers={"Authorization": f"Bearer {token}"})`
  - error mapping with sharper 403 message (mention "Write token" explicitly)
- `mcp-server/src/smartmoney_mcp/tools/__init__.py` — add `from .write_tools import register_write_tools`, export
- `mcp-server/src/smartmoney_mcp/server.py:7-8` — call `register_write_tools(mcp)` after `register_read_tools(mcp)`

Create:
- `mcp-server/src/smartmoney_mcp/tools/write_tools.py`:

```python
"""Write tools exposed to OpenClaw. Requires a Write MCP token (separate from read token).

Tools here trigger writes via backend endpoints whitelisted for the mcp_write token type.
Backend is sole auth authority — MCP only forwards.
"""
import base64
from fastmcp import FastMCP
from ..backend_client import backend_post_multipart


def register_write_tools(mcp: FastMCP) -> None:
    @mcp.tool()
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
```

- `mcp-server/tests/test_import_csv.py` — see Tests below

## Implementation Steps
1. Add `backend_post_multipart` to `backend_client.py` (mirror `backend_get` structure; sharper 403 message).
2. Create `tools/write_tools.py` with the `import_csv` tool above.
3. Wire up registration in `tools/__init__.py` + `server.py`.
4. Run mcp-server tests: `cd mcp-server && uv run pytest -q` — ensure existing 10 tests still pass + new tests pass.

## Tests (`mcp-server/tests/test_import_csv.py`)
Use the same `mock_backend` fixture pattern from `test_token_extraction.py` (httpx MockTransport + monkeypatched `get_http_request`).

- `test_import_csv_happy_path` — request with write token + base64 CSV → outgoing has `?source=paypay`, multipart body contains the decoded bytes, Authorization: Bearer set; returns the JSON shape
- `test_import_csv_invalid_base64_raises_valueerror` — bad base64 → ValueError (LLM-readable)
- `test_import_csv_401_maps_to_write_token_error` — 401 → AuthError mentioning "write token revoked or expired"
- `test_import_csv_403_distinguishes_read_token` — 403 → AuthError that explicitly mentions "Write token" + "Settings" (so the agent can tell the user the right fix)
- `test_import_csv_422_surfaces_backend_detail` — backend rejects CSV with 422 + detail → error surfaces the detail (helps debug bad file)
- `test_import_csv_5xx_hides_topology` — 500 → generic RuntimeError, no `backend`/`8000` in message

## Todo List
- [x] `backend_post_multipart` in `backend_client.py` (with sharper 403 wording)
- [x] `tools/write_tools.py` with `register_write_tools` + `import_csv`
- [x] Register in `tools/__init__.py`
- [x] Call `register_write_tools` in `server.py`
- [x] 6 unit tests in `tests/test_import_csv.py` + token-type filtering tests
- [x] Run full mcp-server test suite (existing 13 + new 6 = 19 all pass)

## Success Criteria
- All tests pass: 10 existing + 6 new = 16 total
- Tool appears in `tools/list` when agent connects (manual probe via curl JSON-RPC, same as Phase 02 verification of prior plan)
- 9 read tools still work (no regression in registration order)

## Tools/list filtering by token type (resolved decision from plan)
User chose option (a): two OpenClaw MCP entries → backend filters tool surface so each entry exposes only the right tools.

Implementation approach:
- Add a FastMCP middleware (or per-request tool registry) in `mcp-server/src/smartmoney_mcp/server.py` that intercepts `tools/list` responses
- Decode (NO signature verification — just claim read) the JWT from `?token=` query param at request time to read the `type` claim
- If `type == "mcp"` (read token) → strip `import_csv` from the returned tools list
- If `type == "mcp_write"` (write token) → strip all 9 read tools, keep ONLY `import_csv`
- If neither / malformed → return full list (let backend reject calls; failing closed at discovery would block diagnostics)
- Backend remains the only auth authority — filtering is UX hint only; mismatched calls still get backend 401/403

Add to phase scope (~30 min extra):
- `mcp-server/src/smartmoney_mcp/tool_filter.py` (new) with `filter_tools_by_token_type(tools: list, token: str) -> list`
- Wire as FastMCP middleware in `server.py`
- 2 unit tests: read token gets 9 tools; write token gets 1 tool

## Risks + Mitigations
- **Read token used for import → confusing error** → sharp 403 message in `backend_post_multipart` mentions "Write token" + "Settings" explicitly
- **Large CSV exceeds MCP message size** → tool accepts up to ~10MB base64 (~7MB raw); document the limit in docstring or add explicit size check
- **Filename containing path separators (`../`)** → backend already validates `.csv` extension; httpx multipart strips paths. Low risk.
- **Token filtering decodes without signature verify** → no security risk (backend still verifies). Only risk: malformed token surfaces wrong tool list. Fail-open returns full list; user sees clear backend 403 on actual call. Acceptable.

## Next Steps
- Once green: Phase 03 (PayPay parser) can complete the import flow; or Phase 03 can run in parallel since it lives in different files
