# Phase 03 — Backend PayPay CSV Parser + Source Dispatch

## Context Links
- Overview: [plan.md](plan.md)
- Scout: [reports/scout-codebase-context.md](reports/scout-codebase-context.md) §1, §2, §8
- PayPay sample: `~/Downloads/paypay_template.csv` (UTF-8 with BOM, English headers, 352 rows)
- Independent of Phase 01/02 (different files; can run in parallel)

## Overview
- Date: 2026-05-31 | Priority: P1 | Impl status: DONE | Review status: DONE
- Extend `POST /api/upload/csv` with optional `?source=paypay` query param. When provided, dispatches to a source-specific parser instead of the generic Japanese mapper. PayPay parser handles: English headers, BOM, split outgoing/incoming amount columns, comma-thousand-separators, Transaction ID dedup.
- **Status:** Implementation complete; 5 new + 10 regression tests passing; deployed to prod backend; parser handles UTF-8 BOM, comma-separated thousands, Transaction ID dedup via sha256.

## Key Insights
- Existing endpoint takes no `source` — generic parser reads source from CSV's `保有金融機関` column. PayPay has no such column → must hardcode `source="PayPay"` in the parser.
- **Transaction ID is a much stronger dedup key than tx_hash** for PayPay (exact unique ID per row). But existing `bulk_create_transactions` dedups via `tx_hash` unique constraint. Two paths:
  - (a) **Use `Transaction ID` as the input to `generate_tx_hash`** (cheapest): `tx_hash = sha256(transaction_id)` for PayPay rows. No schema change, exact dedup as a side effect of hash uniqueness. **Recommended.**
  - (b) Add a separate `external_id` column + unique index. Real cross-source dedup. More invasive.
- "Points, Balance Earned" rows (¥1-60) clutter the dataset. Default-include for completeness, but consider exposing `include_points` flag later. For now: include all (KISS).
- Amount logic: `final_amount = parse(incoming) - parse(outgoing)` where `parse("-")=0`, `parse("1,732")=1732`. Sign convention: positive=income, negative=expense (matches existing `is_income`).
- Category mapping for PayPay: no category column in CSV. Map via Transaction Type:
  - `Payment` → expense (category TBD — could default to "Other" or infer from Business Name later)
  - `Points, Balance Earned` → income, category="Cashback" or "Points"
  - Future LLM categorization can refine; for now keep simple, let user re-categorize in UI.
- BOM handling: pandas `read_csv` with `encoding="utf-8-sig"` strips BOM automatically.

## Requirements
Functional:
- `POST /api/upload/csv?source=paypay` parses PayPay CSV, creates transactions with `source="PayPay"`, dedups by Transaction ID
- `POST /api/upload/csv` (no source) → existing generic behavior (regression-critical)
- Invalid source value → 400 with clear error
- Response shape unchanged: `{filename, total_rows, created, skipped, auto_categorized_count, message}`

Non-functional: parser is its own module, easy to add more sources later (Rakuten Pay, LINE Pay) by adding another module + entry in dispatch dict.

## Architecture

```
POST /api/upload/csv?source=paypay
  → upload.py upload_csv():
      if source:
          if source not in SOURCE_PARSERS: raise HTTPException(400, ...)
          transactions = SOURCE_PARSERS[source].parse(file_bytes, user_id)
      else:
          transactions = parse_csv(file_bytes)  # existing generic path
      created, skipped = TransactionService.bulk_create_transactions(db, transactions)
      return UploadResponse(...)

SOURCE_PARSERS = {"paypay": paypay_csv_parser}
```

PayPay parser flow:
```
read_csv(bytes, encoding="utf-8-sig")
  → for each row:
      date = parse "Date & Time" YYYY/MM/DD HH:MM:SS → date portion
      out_amt = parse_amount("Amount Outgoing (Yen)")  # "1,732" → 1732, "-" → 0
      in_amt  = parse_amount("Amount Incoming (Yen)")
      amount = in_amt - out_amt
      is_income = amount > 0
      description = row["Business Name"]
      tx_id = row["Transaction ID"]
      tx_hash = sha256(f"PAYPAY:{tx_id}")  # exact dedup via existing unique constraint
      category = "Cashback" if "Points" in row["Transaction Type"] else "Other"
      yield transaction dict
```

## Related Code Files
Modify:
- `backend/app/routes/upload.py:28-113` — add `source: str | None = Query(None)` param; if provided, dispatch via parser registry:
  ```python
  from ..utils.paypay_csv_parser import parse_paypay_csv
  SOURCE_PARSERS = {"paypay": parse_paypay_csv}
  
  @router.post("/csv", response_model=UploadResponse)
  async def upload_csv(
      file: UploadFile = File(...),
      source: str | None = Query(None, description="Optional parser source: e.g. 'paypay'"),
      db: Session = Depends(get_db),
      current_user: User = Depends(get_current_user),
  ):
      file_bytes = await file.read()
      if source:
          if source not in SOURCE_PARSERS:
              raise HTTPException(400, f"Unknown source: {source}. Supported: {sorted(SOURCE_PARSERS)}")
          transactions = SOURCE_PARSERS[source](file_bytes, current_user.id)
      else:
          transactions = parse_csv_generic(file_bytes)  # existing path
      ...
  ```

Create:
- `backend/app/utils/paypay_csv_parser.py`:
  ```python
  """PayPay CSV export parser.
  
  Handles English headers, UTF-8 BOM, split outgoing/incoming amount columns,
  comma thousand separators, Transaction ID as exact dedup key.
  """
  import hashlib
  import io
  import pandas as pd
  from datetime import datetime
  
  REQUIRED_COLUMNS = {"Date & Time", "Amount Outgoing (Yen)", "Amount Incoming (Yen)", "Business Name", "Transaction ID", "Transaction Type"}
  
  def _parse_amount(v) -> int:
      """'-' → 0; '1,732' → 1732; '' → 0."""
      s = str(v).strip()
      if not s or s == "-": return 0
      return int(s.replace(",", ""))
  
  def parse_paypay_csv(file_bytes: bytes, user_id: int) -> list[dict]:
      df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig", dtype=str)
      missing = REQUIRED_COLUMNS - set(df.columns)
      if missing:
          raise ValueError(f"PayPay CSV missing required columns: {sorted(missing)}")
      out = []
      for _, row in df.iterrows():
          out_amt = _parse_amount(row["Amount Outgoing (Yen)"])
          in_amt  = _parse_amount(row["Amount Incoming (Yen)"])
          amount = in_amt - out_amt
          if amount == 0: continue  # skip zero-value rows
          dt = datetime.strptime(row["Date & Time"].strip(), "%Y/%m/%d %H:%M:%S")
          tx_id = str(row["Transaction ID"]).strip()
          tx_hash = hashlib.sha256(f"PAYPAY:{tx_id}".encode()).hexdigest()
          is_points = "Points" in str(row["Transaction Type"])
          out.append({
              "date": dt.date(),
              "description": str(row["Business Name"]).strip(),
              "amount": abs(amount),
              "category": "Cashback" if is_points else "Other",
              "source": "PayPay",
              "is_income": amount > 0,
              "is_transfer": False,
              "month_key": dt.strftime("%Y-%m"),
              "tx_hash": tx_hash,
              "user_id": user_id,
          })
      return out
  ```

- `backend/tests/fixtures/paypay_sample.csv` — sanitized 5-row subset of user's template (header + 5 rows covering: Payment expense, Points earned, mixed types)
- `backend/tests/test_paypay_csv_parser.py` — see Tests below

## Implementation Steps
1. Sanitize a 5-row sample from `~/Downloads/paypay_template.csv` → `backend/tests/fixtures/paypay_sample.csv` (preserve UTF-8 BOM; pick rows that include Payment + Points + a comma-amount; redact User column if present).
2. Create `paypay_csv_parser.py` (above).
3. Modify `upload.py`: add `source` Query param + dispatch dict; keep existing path when `source` is None (backward compat).
4. Write tests (5 below).
5. Run: `cd backend && uv run pytest tests/test_paypay_csv_parser.py tests/test_mcp_token.py -q` → ensure no regression.

## Tests (`backend/tests/test_paypay_csv_parser.py`)
- `test_parse_paypay_csv_happy` — load fixture → expected number of rows, correct amounts (one expense, one income), correct dedup hashes
- `test_parse_paypay_csv_handles_bom_and_commas` — amounts like "1,732" parsed to 1732; BOM doesn't break header detection
- `test_parse_paypay_csv_missing_columns_raises` — drop "Transaction ID" column → ValueError with helpful message
- `test_parse_paypay_csv_skips_zero_amount_rows` — row with both outgoing+incoming = `-` → skipped (not in output)
- `test_upload_endpoint_dispatches_paypay_source` — POST `/api/upload/csv?source=paypay` with fixture → calls PayPay parser, NOT generic; existing endpoint behavior with no `source` still works (1 test each)

## Todo List
- [x] Create sanitized PayPay fixture (5 rows)
- [x] Implement `paypay_csv_parser.py`
- [x] Extend `upload.py` with `source` query param + dispatch dict
- [x] Write 5 tests (plus 10 regression tests all passing)
- [x] Confirm no regression on existing generic upload (all existing tests pass)
- [x] Ensure existing `test_mcp_token.py` still passes (+ all MCP tests)

## Success Criteria
- 5 new tests pass; no regression in existing tests
- Upload of user's real PayPay CSV (via curl with access token) → returns sensible `{created, skipped, total_rows}` matching CSV row count
- Re-uploading same CSV → 100% skipped (dedup via Transaction ID hash works)

## Risks + Mitigations
- **PayPay changes their CSV header names** → `REQUIRED_COLUMNS` validation catches it early with a clear error
- **Some rows have missing/malformed Transaction ID** → fall back to hash-of-row content (defensive); flag in logs
- **Multi-currency rows (Amount Outgoing Overseas + Exchange Rate)** → not handled in v1; document limitation. Only single-JPY rows in scope. Add detection: if "Amount Outgoing Overseas" != "-", skip row + log warning.
- **Category defaulting to "Other" floods that category** → acceptable for v1; user can re-categorize in UI; future ML categorization can improve

## Next Steps
- Phase 04 deploys + verifies end-to-end via Telegram
