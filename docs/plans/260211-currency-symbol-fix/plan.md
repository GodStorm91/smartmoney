# Budget Currency Symbol Fix

**Date:** 2026-02-11
**Status:** Ready for implementation
**Severity:** Bug -- wrong currency symbols displayed on budget pages

## Root Cause

Three budget components define a local `formatCurrency` helper that hardcodes `settings.currency` (user preference, e.g. JPY):

```typescript
const formatCurrency = (amount: number) =>
  formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
```

When rendering per-transaction amounts, they call `formatCurrency(tx.amount)` which ignores `tx.currency`. A USD transaction shows with a JPY symbol.

**Already correct:** `SwipeableTransactionCard.tsx` passes `transaction.currency || 'JPY'` directly.

## Signature Reference

```typescript
// from frontend/src/utils/formatCurrency.ts
formatCurrencyPrivacy(
  amount: number,
  currency: string = 'JPY',         // <-- this should be tx.currency for per-tx display
  rates: Record<string, number>,
  isNativeCurrency: boolean,         // true = show in native currency symbol
  isPrivacyMode: boolean
): string
```

The `Transaction` type at `frontend/src/types/transaction.ts:7` already has `currency: string`.

## Fix Strategy

Add a second helper `formatTxCurrency` alongside the existing `formatCurrency` in each file. The existing `formatCurrency` stays for budget-level totals (budgeted, spent, comparison) which are correctly displayed in the user's base currency. Only per-transaction renders switch to the new helper.

```typescript
const formatTxCurrency = (amount: number, txCurrency?: string) =>
  formatCurrencyPrivacy(amount, txCurrency || currency, exchangeRates?.rates || {}, true, isPrivacyMode)
```

Fallback: if `tx.currency` is null/undefined, falls back to `currency` (settings). This covers legacy data that may lack a currency field.

---

## File 1: `frontend/src/components/budget/transaction-section.tsx`

**Dependencies already available:** `currency` (settings), `isPrivacyMode`, `exchangeRates` -- all present.

### Change A -- Add helper (after line 47)

**Old (line 46-47):**
```typescript
  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
```

**New:**
```typescript
  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
  const formatTxCurrency = (amount: number, txCurrency?: string) =>
    formatCurrencyPrivacy(amount, txCurrency || currency, exchangeRates?.rates || {}, true, isPrivacyMode)
```

### Change B -- Use helper in render (line 200)

**Old:**
```typescript
            {formatCurrency(transaction.amount)}
```

**New:**
```typescript
            {formatTxCurrency(transaction.amount, transaction.currency)}
```

**Locations:** 1 occurrence (line 200).

---

## File 2: `frontend/src/components/budget/budget-detail-panel.tsx`

**Dependencies already available:** `currency` (settings), `isPrivacyMode`, `exchangeRates` -- all present.

### Change A -- Add helper (after line 67)

**Old (line 66-67):**
```typescript
  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
```

**New:**
```typescript
  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
  const formatTxCurrency = (amount: number, txCurrency?: string) =>
    formatCurrencyPrivacy(amount, txCurrency || currency, exchangeRates?.rates || {}, true, isPrivacyMode)
```

### Change B -- Inline mode transaction render (line 299)

**Old:**
```typescript
                 <span className="text-sm font-medium text-gray-900 dark:text-gray-100 ml-4">{formatCurrency(tx.amount)}</span>
```

**New:**
```typescript
                 <span className="text-sm font-medium text-gray-900 dark:text-gray-100 ml-4">{formatTxCurrency(tx.amount, tx.currency)}</span>
```

### Change C -- Overlay mode transaction render (line 450)

**Old:**
```typescript
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 ml-4">
                      {formatCurrency(transaction.amount)}
                    </span>
```

**New:**
```typescript
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 ml-4">
                      {formatTxCurrency(transaction.amount, transaction.currency)}
                    </span>
```

**Note:** Budget-level amounts (`trackingItem?.budgeted`, `currentSpent`, `previousMonthSpent`) remain using `formatCurrency` -- these are aggregated values already converted to the user's base currency.

**Locations:** 2 occurrences (lines 299, 450).

---

## File 3: `frontend/src/components/budget/tabs/transactions-tab.tsx`

**Dependencies already available:** `currency` (settings), `isPrivacyMode`, `exchangeRates` -- all present.

### Change A -- Add helper (after line 40)

**Old (line 37-40):**
```typescript
  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
  const fmtShort = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)
```

**New:**
```typescript
  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
  const formatTxCurrency = (amount: number, txCurrency?: string) =>
    formatCurrencyPrivacy(amount, txCurrency || currency, exchangeRates?.rates || {}, true, isPrivacyMode)
  const fmtShort = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)
```

### Change B -- Transaction render (line 165)

**Old:**
```typescript
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(tx.amount)}</span>
```

**New:**
```typescript
                <span className="font-semibold text-gray-900 dark:text-white">{formatTxCurrency(tx.amount, tx.currency)}</span>
```

**Note:** `fmtShort` usages on lines 136 (budget progress bar) remain unchanged -- they display aggregated budget amounts in the user's currency, not per-transaction values.

**Locations:** 1 occurrence (line 165).

---

## Edge Cases

| Case | Handling |
|---|---|
| `tx.currency` is `undefined` or `null` | Fallback `txCurrency \|\| currency` uses settings currency |
| `tx.currency` is unknown (no rate) | `formatCurrencyPrivacy` already handles missing rates gracefully -- displays amount with currency code |
| Privacy mode | No change -- `isPrivacyMode` flag still masks values regardless of currency |
| Budget-level totals (budgeted, spent, comparison) | Unchanged -- these are pre-aggregated in JPY by the backend/conversion logic |

## Scope

- 3 files modified
- 0 new dependencies
- 0 API changes
- 4 render call sites updated (1 + 2 + 1)

## Verification

After implementation, manually verify:
1. Budget page with mixed-currency transactions (e.g. JPY + USD) -- each row shows correct symbol
2. Budget detail panel (both overlay and inline) -- same check
3. Transactions tab -- same check
4. Budget summary totals still show in user's base currency (JPY)
5. Privacy mode still masks all values
