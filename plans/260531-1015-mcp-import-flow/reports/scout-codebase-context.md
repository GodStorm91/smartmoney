# Scout Report — Codebase Context for MCP Import Flow

Date: 2026-05-31

## 1. CSV Import Endpoint
- File: `backend/app/routes/upload.py:28-113`
- Route: `POST /api/upload/csv`
- Auth: `Depends(get_current_user)` (accepts access + mcp tokens; mcp gets 403 on non-GET via `dependencies.py` gate)
- Input: `UploadFile` multipart, `.csv` only, ≤50MB
- **No `source` param today** — column mapping is generic, source value comes from CSV row column `保有金融機関`
- Response: `UploadResponse{filename, total_rows, created, skipped, auto_categorized_count, message}`

## 2. CSV Parser Layer
- Column mapping: `backend/app/utils/csv_column_mapper.py:11-80` (Japanese headers only: 日付, 内容, 金額（円）, 大項目, 保有金融機関, ...)
- Row parsing: `backend/app/utils/csv_row_parser.py:8-40` — uses pandas, maps category via `map_category()`
- No source enum / parser registry — single generic mapper
- Bulk insert: `TransactionService.bulk_create_transactions(db, transactions_data)` (returns `created, skipped`)
- Dedup: `transaction_hasher.py` generates `tx_hash = sha256(date|amount|description|source)`, unique constraint enforces skip

## 3. MCP Token Auth
- `backend/app/auth/utils.py:36-49` — `create_mcp_token(data, jti, expires_days=365)` sets `type:"mcp"`, `jti`
- `backend/app/auth/dependencies.py:17-59` — `get_current_user` accepts `access|mcp`; when `mcp`:
  - Verifies `payload.jti == user.mcp_token_jti` (revocation check)
  - **Gates writes: `if request.method not in {"GET","HEAD","OPTIONS"} → 403 "MCP tokens are read-only"`**
- `backend/app/models/user.py:41-42` — columns: `mcp_token_jti: Mapped[str|None] = mapped_column(String(64), nullable=True)`, `mcp_token_created_at: Mapped[datetime|None]`

## 4. MCP Server Tool Layout
- `mcp-server/src/smartmoney_mcp/tools/__init__.py` — exports `register_read_tools`
- `mcp-server/src/smartmoney_mcp/tools/read_tools.py` — 9 `@mcp.tool()` decorators, each wraps a `backend_get(path, params)` call
- `mcp-server/src/smartmoney_mcp/backend_client.py:45-68` — **only `backend_get()` exists today** (no POST helper)
- Token extraction in `backend_client.py:22-34`: `?token=` query (primary), `Authorization: Bearer` (fallback)

## 5. Existing Tests
- `backend/tests/test_mcp_token.py` — 3 tests: full lifecycle (issue → read → 403 on POST → revoke → 401), access-token regression, status roundtrip
- `mcp-server/tests/test_token_extraction.py` — 10 tests: extraction (5) + forwarding (5: query→bearer, none dropped, 401/403/5xx mapping)

## 6. Alembic Migration Pattern
- Latest: `backend/alembic/versions/20260523_0810_a1b2c3d4e5f6_add_mcp_jti_to_users.py`
- `upgrade()`: `op.add_column("users", sa.Column("mcp_token_jti", sa.String(64), nullable=True))` + `mcp_token_created_at`
- Use `uv run alembic revision -m "..."` to get a new revision ID; hand-edit the `upgrade`/`downgrade` ops

## 7. Frontend Settings UI
- `frontend/src/components/settings/McpTokenSection.tsx` — 4 UI states: loading / no-token / has-token / fresh-token-once-shown (amber alert + copy + JSON snippet)
- `frontend/src/services/mcp-token-service.ts` — 3 functions: `fetchMcpTokenStatus()`, `generateMcpToken()`, `revokeMcpToken()`
- `backend/app/routes/mcp_token.py:19-64` — 3 routes: POST/DELETE/GET under `/api/auth/mcp-token`

## 8. PayPay CSV Format (sample from user)
- Path: `~/Downloads/paypay_template.csv` (352 rows, UTF-8 with BOM)
- Headers (English): `Date & Time, Amount Outgoing (Yen), Amount Incoming (Yen), Amount Outgoing Overseas, Currency, Exchange Rate (Yen), Country Paid In, Transaction Type, Business Name, Method, Payment Option, User, Transaction ID`
- Amount: split across `Outgoing` and `Incoming` columns, `-` placeholder when empty; thousand-separator commas ("1,732")
- Date: `YYYY/MM/DD HH:MM:SS` (take date portion)
- **Transaction ID present** → exact dedup key (better than fuzzy tx_hash)
- Transaction Type values seen: `Payment`, `Points, Balance Earned` (¥1–60 trivial earnings — consider opt-in include)
- Existing Japanese mapper won't match PayPay headers → need new variant

## 9. Cross-Plan: PayPay OCR (superseded)
- `plans/251223-1100-paypay-ocr-upload/` — status `Ready for Implementation`, never built
- Competing approach: Claude Vision OCR on app screenshots → JSON transactions
- Decision: **CSV supersedes OCR** (deterministic, complete, free, has exact dedup via Transaction ID)
- Action: mark OCR plan `status: superseded` with `superseded-by` pointer
