# Code Review — Phases 01-03 of MCP Import Flow

**Reviewer:** code-reviewer (staff-engineer mode)
**Date:** 2026-05-31
**Scope:** Backend write-token tier, MCP `import_csv` tool + tool filter, PayPay CSV parser.
**Verdict:** **GO** for Phase 04 (deploy) with two LOW-severity items recommended (non-blocking).

---

## Score: 8.5 / 10

Strong fundamentals: fail-closed allowlist, jti revocation symmetry, explicit regression tests, parser hygiene, clear separation of read vs write surfaces. Loses points on minor error-message UX and a couple of edge cases in `_parse_amount`.

---

## Test status (verified locally)
- `backend/tests/test_mcp_write_token.py + test_mcp_token.py + test_paypay_csv_parser.py` → **14/14 pass**
- `mcp-server/tests/test_import_csv.py + test_tool_filter.py` → **9/9 pass**

---

## Findings

### CRITICAL — none

### HIGH — none

The auth surface is sound. Specifically verified:

- `get_current_user` order: type-check first → user load → per-type gates. The `mcp` read gate (`_SAFE_METHODS`) and `mcp_write` allowlist gate are mutually exclusive `if` branches keyed on `token_type`, so a write token cannot bypass either gate by switching type claim.
- `WRITE_TOKEN_ALLOWLIST` is fail-closed: any unknown path → 403. Tested explicitly (`test_write_token_blocked_on_non_allowlisted_endpoint`).
- jti revocation symmetric between `mcp` and `mcp_write`: both compare `payload.jti` against the user's stored jti and 401 on mismatch. Verified by `test_write_token_blocked_when_revoked`.
- `redirect_slashes=False` in `app/main.py:73` + Starlette's normalized `request.url.path` make `/api/upload/csv/`, `/api/upload/CSV`, and URL-encoded variants 404 before the auth dep sees them. No path-traversal vector found.
- Existing `mcp` read-token regression test (`test_read_mcp_token_still_403_on_writes_regression`) still passes — `_SAFE_METHODS` gate intact.

### MEDIUM

#### M1. `_parse_amount` happily parses unexpected negatives
`backend/app/utils/paypay_csv_parser.py:25-33`

```python
def _parse_amount(v) -> int:
    s = str(v).strip()
    if not s or s == "-": return 0
    return int(s.replace(",", ""))
```

`int("-100")` returns `-100`. PayPay's format uses split outgoing/incoming columns so a `-` in either is a marker, not a signed number — but if PayPay ever changes the format and emits a signed value, the parser silently inverts the meaning (an income negative would flip `amount = in - out` and `is_income` to the wrong polarity). Also `int("1.5")` raises `ValueError` and bubbles to a 400 — acceptable but worth being defensive.

**Suggested fix:**
```python
if not s or s == "-": return 0
# PayPay amounts are always positive integers; reject other shapes loudly.
n = int(s.replace(",", ""))
if n < 0:
    raise ValueError(f"Unexpected negative PayPay amount: {v!r}")
return n
```

Impact: protects against silent meaning-flip on future PayPay format change. Low immediate likelihood, defensive-coding only.

#### M2. `backend_post_multipart` swallows 400 detail under generic error
`mcp-server/src/smartmoney_mcp/backend_client.py:77-80`

```python
if resp.status_code >= 400:
    raise RuntimeError(f"SmartMoney returned an error ({resp.status_code}) during upload.")
```

The endpoint returns 400 for:
- "Only CSV files are allowed"
- "Unknown source: 'foo'. Supported: ['paypay']"
- `CSVParseError` from generic parser
- `ValueError` from PayPay parser ("missing required columns")

All of these are actionable for the user (and for the LLM agent), but they get squashed to a topology-free generic message. 422 already surfaces detail (test `test_import_csv_422_surfaces_backend_detail`); 400 deserves the same treatment since the backend itself emits 400 with detail (not the upstream proxy).

**Suggested fix:** add a 400-branch above the generic 5xx-style branch:
```python
if resp.status_code == 400:
    try:
        detail = resp.json().get("detail", resp.text)
    except Exception:
        detail = resp.text
    raise RuntimeError(f"CSV rejected: {detail}")
```

Impact: agent can tell the user *why* the import failed instead of just "an error (400)". Non-blocking but a clear UX win.

### LOW

#### L1. NaN in optional columns becomes string `"nan"`
`backend/app/utils/paypay_csv_parser.py:93`

`str(row["Business Name"]).strip()` produces `"nan"` if pandas reads an empty cell as NaN. With `dtype=str` this is mitigated (empty → `""` or `nan`-string depending on pandas version). Minor cosmetic concern; the row still imports with `description="nan"`. Consider:
```python
desc = str(row["Business Name"]).strip()
if desc.lower() == "nan": desc = ""
```

#### L2. No row-count ceiling on PayPay parser
The endpoint enforces 50 MB on file size, but a 50 MB CSV could be ~250k rows. `bulk_create_transactions` does per-row `commit()` (one INSERT + one COMMIT per row, see `transaction_service.py:53-60`), which would be very slow. This is **not new** — the generic path has the same shape — so does not block Phase 04. Flag for a future "batch insert" pass.

#### L3. `parse_paypay_csv` does no in-batch dedup
If the same `Transaction ID` appears twice in one upload, both rows hit `bulk_create_transactions`; the second one gets caught by the unique constraint (`IntegrityError` → `skipped += 1`). Functionally correct but generates an extra rollback. Cosmetic.

#### L4. `mcp-server` tool docstring claims sources are `{"paypay"}` but error path silently passes any string through
`mcp-server/src/smartmoney_mcp/tools/write_tools.py:22`

`source` is just forwarded; backend rejects unknown values with 400. With M2 fixed, that 400's detail will surface to the agent — fine. Without M2, the agent gets a generic error and can't recover. Lower priority than M2 itself.

### NIT

#### N1. DRY between read and write token routes
`backend/app/routes/mcp_token.py` — read + write routes are near-identical (POST/DELETE/GET × 2). For two token types this is fine (extracting a factory helper would obscure things). If a third token type lands, refactor then.

#### N2. Test for write-token-on-non-allowlisted hits an `/api/auth/mcp-token` POST
`backend/tests/test_mcp_write_token.py:127`

Works but is brittle: if `mcp-token` route changes auth-dep, the test could pass for the wrong reason. Consider adding a second negative test against a known data-writing endpoint (e.g., `DELETE /api/transactions/{id}`) for extra confidence. Non-blocking.

#### N3. `tool_filter.py:35` imports `jwt` inside the function
Style choice — works fine. Slight per-call import overhead; module-top import would be cleaner.

#### N4. `McpWriteTokenSection.tsx` near-duplicate of `McpTokenSection.tsx`
Extracting a shared component is plausible but each section has materially different copy (warning level, button labels, expiry messaging). v1 duplication acceptable; revisit if a third token type appears.

---

## Verified non-issues

- **Tool list filter fail-open with malformed JWT:** intentional per spec (backend is sole auth authority); tests cover all three branches; safe.
- **Tool filter decodes JWT without signature verification:** correct — `tool_filter.py:5-12` documents why. Backend re-verifies on every actual call.
- **`on_list_tools` is a valid FastMCP `Middleware` hook** — confirmed by introspection; middleware tests pass against real fastmcp 3.3.1.
- **Migration safety:** additive nullable columns; correct `down_revision = 'a1b2c3d4e5f6'`; symmetric `upgrade`/`downgrade`. No backfill or data migration needed.
- **Cross-user tx_hash collision:** `tx_hash = sha256("{user_id}|PAYPAY:{tx_id}")` scopes per user — matches the generic `generate_tx_hash` convention.
- **Token in `?token=` query string:** rationale documented (OpenClaw header-drop bug, openclaw/openclaw#65590); uvicorn `access_log=False` + nginx `access_log off` prevent log leakage. Acceptable.
- **Frontend service paths match backend routes:** verified `/api/auth/mcp-write-token` GET/POST/DELETE.
- **Phase 02 `backend_post_multipart` Authorization forwarding:** verified by test (`req.headers["authorization"] == "Bearer write-jwt"`).

---

## Behavioral checklist (Staff)

- [x] Concurrency: no shared mutable state introduced; jti rotation atomic per route.
- [x] Error boundaries: all `ValueError`/`CSVParseError` in upload caught; `backend_post_multipart` covers 401/403/422/5xx with explicit branches.
- [x] API contracts: response schemas unchanged (`UploadResponse`); `McpTokenResponse` reused for write token.
- [x] Backwards compatibility: existing `mcp` read-token path verified by 2 regression tests; existing generic upload path preserved when `source` is None.
- [x] Input validation: file extension + 50MB + required-columns + source-allowlist + base64 decode all checked at boundary.
- [x] Auth/authz: identity (jti) + permission (allowlist) both checked for `mcp_write`.
- [x] N+1: existing per-row commit pattern unchanged (flagged as L2 for future).
- [x] Data leaks: 5xx hides backend topology; tokens never logged (uvicorn access_log off); status endpoints never return token.

---

## Go / No-Go for Phase 04

**GO.** No critical or high issues. M1 and M2 are non-blocking — recommend addressing M2 before deploy (15-line change) for a meaningfully better LLM-agent error surface, but it does not affect security or correctness of the import flow itself. Deploy can proceed; M1 can ride a follow-up.

---

## Recommended actions (ordered)
1. (Optional, 5 min) Add 400-detail branch to `backend_post_multipart` (M2).
2. (Optional, 5 min) Reject negative `_parse_amount` values (M1).
3. (Backlog) Batch-insert path for bulk uploads (L2) — applies to all sources, not write-token-specific.

## Unresolved questions
1. Should the agent see backend 400 details directly, or always get sanitized messages? (Answering M2.) Recommend: yes for 400, since the user authored the input (CSV).
2. Should `_parse_amount` accept negatives if PayPay starts emitting signed amounts? Recommend: refuse and bump format version when that happens (M1).
3. L2 batch insert: should this be a separate plan, or piggyback on Phase 04 deploy verification? Recommend: separate plan, post-deploy.
