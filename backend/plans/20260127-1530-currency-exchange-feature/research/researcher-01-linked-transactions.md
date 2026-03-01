# Research: Linked Transactions & Currency Exchange Patterns

## 1. Database Patterns for Linked Transactions

### Parent-Child Relationships
Financial apps use hierarchical models to link related transactions:
- **Parent transactions** (e.g., multi-leg currency exchange) contain multiple **child entries**
- **Append-only ledgers** store transaction history immutably; balances calculated from history sums
- **Account hierarchies**: households (parent) → individual/joint accounts (children) with transaction records at leaf level
- **Metadata linking**: textual descriptions, categorization, and timestamps enable transaction relationship discovery

### Double-Entry Accounting Model
Core principle: all transactions must balance to zero (debits = credits).

**Schema approach:**
- `JOURNAL` table: represents complete business transaction unit
- `POSTING` table: individual debit/credit entries linked to parent journal
- **Bidirectional references**: each transaction maintains opposing entry pairs
- **Atomic consistency**: all POSTING entries for a JOURNAL succeed together or all fail
- Supports two-leg (simple transfer) and multi-leg (complex exchanges) patterns

**Key insight:** Multi-leg transactions allow N entries summing to zero, essential for currency exchanges with fees.

## 2. Exchange Rate Storage Best Practices

### Rate Capture Strategy
- **Snapshot at transaction time**: store exchange rate used in transaction (never recalculate)
- **Historical rate tables**: maintain audit trail of all rates by date/currency pair
- **Precision**: store as decimal (not float) to prevent rounding errors in financial calcs
- **Quote vs. Mid rates**: capture both if performing spreads/fees

### System Architecture
Enterprise solutions use:
- **ERP (Enterprise Resource Planning)**: real-time exchange rate monitoring, automated revaluations
- **TMS (Treasury Management System)**: centralized FX exposure management, netting, hedging
- **Multicurrency accounts**: hold balances in multiple currencies to reduce conversion frequency

**Practical approach for SME/personal finance:**
- Cache current rates from external API (e.g., OpenExchangeRates, Wise API)
- Store transaction exchange rate immutably with transaction
- Periodic revaluation for unrealized gains (optional, marks to market)

### Risk Governance
- Timestamp exchange rate captures precisely
- Log all FX conversions for audit/compliance
- Document rate source and any fees/spreads applied

## 3. Currency Exchange UI Form Patterns

### Core Form Design
**Best practices for fintech forms (2026):**
- **Progressive disclosure**: collect info gradually (reduce cognitive load)
- **Single-step screens**: break forms into sequential steps
- **Live validation**: prevent submission errors before form completion
- **Context-aware**: show relevant fields based on account types, currencies available

### Exchange-Specific Patterns
- **Source/destination selectors**: dropdown or account pills
- **Amount preview**: show converted amount real-time as user types
- **Rate display**: show current rate with timestamp + note if stale
- **Fee transparency**: clearly display all fees/spreads before confirmation
- **Confirmation screen**: review source, amount, rate, destination, fees before submit

### Modern Security & UX
- **Biometric auth**: fingerprint/facial recognition at sensitive operations
- **Behavioral validation**: detect fraud patterns, step-up auth if unusual
- **Mobile-first**: responsive design for on-the-go exchanges
- **Notification**: real-time rate alerts when traveling (geofencing-triggered)

## 4. Implementation Recommendations for SmartMoney

### Database Changes
```
transactions:
  - parent_transaction_id (FK, self-referential for multi-leg)
  - exchange_rate_id (FK to exchange_rates table)
  - transaction_type ENUM (normal, exchange, fee)

exchange_rates:
  - id, from_currency, to_currency
  - rate DECIMAL(18,8)
  - timestamp, source
```

### API Contract
- POST `/transactions/exchange` accepts source_account, dest_account, amount, currency_pair
- Returns transaction group with all linked entries (transfer + reverse + fees)
- GET `/transactions/{id}/linked` returns all related transactions

### UI Components
- `CurrencyExchangeForm` with progressive field reveals
- `ExchangeRateDisplay` showing rate + timestamp
- `ExchangeFeeBreakdown` showing all costs
- Confirmation modal before final submission

## Sources

- [Best Database for Financial Data: 2026 Architecture Guide](https://www.ispirer.com/blog/best-database-for-financial-data)
- [Plaid Transactions API](https://plaid.com/products/transactions/)
- [Double-entry bookkeeping for programmers](https://www.balanced.software/double-entry-bookkeeping-for-programmers/)
- [Books: Immutable double-entry accounting database service](https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service/)
- [Multicurrency Accounting: An Essential Guide](https://www.acumatica.com/blog/multi-currency-accounting/)
- [Fintech design guide with patterns that build trust](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- [Top 10 Fintech UX Design Practices Every Team Needs in 2026](https://www.onething.design/post/top-10-fintech-ux-design-practices-2026)
- [An Engineer's Guide to Double-Entry Bookkeeping](https://anvil.works/blog/double-entry-accounting-for-engineers)
