# Research: Existing SmartMoney Codebase Structure

## Transaction Model (`backend/app/models/transaction.py`)

**Current Structure:**
- Base model with 23 fields including transfer-specific columns
- Amount stored in BigInteger (cents/smallest unit) in account's native currency
- Single currency field (ISO 4217) - currently JPY only via CSV

**Transfer-Related Fields:**
- `is_transfer: bool` - Flag marking transfer transactions
- `transfer_id: str | None` - UUID linking paired transactions
- `transfer_type: str | None` - Enum: "outgoing", "incoming", "fee"

**Currency Support:**
- `currency: str` - ISO 4217 code (default "JPY")
- No multi-currency conversion fields yet

**Key Relationships:**
- `account_id` (FK) → Account with back_populates
- No direct peer transaction relationship

## Transfer Handling (`backend/app/routes/transfers.py`)

**Current Implementation (3 endpoints):**
1. `POST /api/transfers/` - Create transfer with UUID-linked transaction pair
   - Validates accounts belong to user
   - Creates outgoing tx (negative amount) from source
   - Creates incoming tx (positive amount) to destination
   - Optional fee transaction (third tx)
   - No exchange rate conversion - amounts passed as-is

2. `DELETE /api/transfers/{transfer_id}` - Deletes all linked transactions

3. `GET /api/transfers/` - Lists transfers with paired account/amount info

**Limitations:**
- No currency exchange handling
- Assumes `from_amount == to_amount` (no FX conversion)
- Uses timestamp for tx_hash uniqueness (not deterministic)
- No exchange rate logging

## Account Model (`backend/app/models/account.py`)

**Structure:**
- 8 account types: bank, cash, credit_card, investment, receivable, other
- Currency per account (default "JPY")
- Initial balance tracking with date

**Relationships:**
- 1-to-many with Transaction via `account_id`
- 1-to-many with RecurringTransaction

**Gap:** No built-in exchange rate reference between accounts

## Integration Points

**Transaction-Account Link:**
- Account contains all transactions via relationship
- Filtering possible by `Account.id` and `Account.currency`
- No multi-account queries (no JOIN patterns in existing routes)

**Transfer Workflow:**
- Both txs share same `transfer_id`, different `transfer_type`
- Fee tx linked but marked `is_transfer=False`
- Allows transfer deletion as single unit

## Findings for Currency Exchange Feature

**Ready to Extend:**
- Transfer route pattern suitable for FX handling
- Account currency field supports multi-currency
- Transfer ID linking mechanism works for paired txs

**Required Additions:**
- Exchange rate storage/lookup (new service)
- `exchange_rate` field in Transaction or separate rate log
- FX fee vs transfer fee distinction
- Rate source auditing (OpenExchangeRates, ECB, etc.)

**No Breaking Changes Required**
- Existing transfers can work with null exchange_rate
- Backward compatible with current JPY-only data

## Unresolved Questions

- Should exchange rates be cached per transaction or fetched on-demand?
- How to handle rate fluctuations for historical transfers?
- Multi-leg transfers (e.g., JPY → USD → EUR)?
