# Phase 3: Frontend UI

**Status:** PENDING | **Est. Effort:** 2 hours

---

## Context

- [Main Plan](./plan.md) | [Phase 2: Backend API](./phase-02-backend-api.md)
- Depends on: Phase 2 completion

## Overview

Extend existing `TransferFormModal` with exchange-specific features: auto-calc exchange rate, optional income linking dropdown.

## Requirements

1. Form fields: date, from account, from amount, to account, to amount, notes
2. Auto-calculate exchange rate when both amounts entered
3. Display calculated rate (e.g., "1 VND = 0.0063 JPY")
4. Optional dropdown to link existing income transaction
5. Filter income dropdown by source currency matching from_account

## Related Files

| File | Action |
|------|--------|
| `frontend/src/components/transfers/TransferFormModal.tsx` | Extend or duplicate for exchange |
| `frontend/src/services/transfer-service.ts` | Add createExchange function |
| `frontend/src/types/transfer.ts` | Add ExchangeCreate type |

## Type Additions

**File:** `frontend/src/types/transfer.ts` - Add:

```typescript
export interface ExchangeCreate {
  date: string
  from_account_id: number
  from_amount: number
  to_account_id: number
  to_amount: number
  exchange_rate?: number
  link_to_transaction_id?: number
  notes?: string
}

export interface ExchangeResponse {
  transfer_id: string
  from_transaction_id: number
  to_transaction_id: number
  exchange_rate: number
  linked_income_id?: number
}
```

## Service Addition

**File:** `frontend/src/services/transfer-service.ts` - Add:

```typescript
import type { ExchangeCreate, ExchangeResponse } from '@/types/transfer'

export async function createExchange(data: ExchangeCreate): Promise<ExchangeResponse> {
  const response = await apiClient.post<ExchangeResponse>('/api/transfers/exchange', data)
  return response.data
}
```

## UI Component Changes

**Option A (Recommended):** Add toggle to existing `TransferFormModal` for "Currency Exchange" mode.

**Option B:** Create separate `CurrencyExchangeModal` component (more duplication).

### Option A Implementation - Key Changes

**File:** `frontend/src/components/transfers/TransferFormModal.tsx`

Add state for exchange mode:
```typescript
const [isExchangeMode, setIsExchangeMode] = useState(false)
const [linkToIncomeId, setLinkToIncomeId] = useState<number | null>(null)
```

Add income transaction query (when exchange mode enabled):
```typescript
const { data: incomeTransactions } = useQuery({
  queryKey: ['income-transactions', fromAccount?.currency],
  queryFn: () => fetchTransactions({
    type: 'income',
    // Filter by currency if API supports, or filter client-side
  }),
  enabled: isExchangeMode && !!fromAccount,
})
```

Add toggle in form header:
```tsx
<div className="flex items-center gap-2 mb-4">
  <label className="text-sm text-gray-600">
    <input
      type="checkbox"
      checked={isExchangeMode}
      onChange={e => setIsExchangeMode(e.target.checked)}
      className="mr-2"
    />
    {t('transfer.exchangeMode')}
  </label>
</div>
```

Add income linking dropdown (when exchange mode):
```tsx
{isExchangeMode && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {t('transfer.linkToIncome')} ({t('optional')})
    </label>
    <select
      value={linkToIncomeId || ''}
      onChange={e => setLinkToIncomeId(e.target.value ? parseInt(e.target.value) : null)}
      className="w-full h-12 px-4 border rounded-lg"
    >
      <option value="">{t('transfer.noLink')}</option>
      {incomeTransactions
        ?.filter(tx => tx.currency === fromAccount?.currency)
        .map(tx => (
          <option key={tx.id} value={tx.id}>
            {tx.date} - {tx.description} ({formatCurrency(tx.amount, tx.currency)})
          </option>
        ))}
    </select>
  </div>
)}
```

Modify submit handler:
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  if (!validate()) return

  if (isExchangeMode) {
    const exchangeData: ExchangeCreate = {
      date,
      from_account_id: fromAccountId!,
      from_amount: toStorageAmount(parseNumber(fromAmount), fromCurrency),
      to_account_id: toAccountId!,
      to_amount: toStorageAmount(parseNumber(toAmount), toCurrency),
      link_to_transaction_id: linkToIncomeId || undefined,
      notes: description.trim() || undefined,
    }
    exchangeMutation.mutate(exchangeData)
  } else {
    // Existing transfer logic
    mutation.mutate(data)
  }
}
```

## i18n Keys to Add

```json
{
  "transfer": {
    "exchangeMode": "Currency Exchange",
    "linkToIncome": "Link to Income",
    "noLink": "None"
  }
}
```

## Todo List

- [ ] Add ExchangeCreate, ExchangeResponse types
- [ ] Add createExchange service function
- [ ] Add exchange mode toggle to TransferFormModal
- [ ] Add income linking dropdown
- [ ] Add exchange mutation handler
- [ ] Add i18n keys (en, ja, vi)
- [ ] Test exchange flow end-to-end

## Success Criteria

- [ ] Exchange mode toggle works
- [ ] Exchange rate displays correctly during input
- [ ] Income dropdown filters by matching currency
- [ ] Exchange creates linked transactions
- [ ] Form resets after successful exchange
- [ ] Error handling displays correctly
- [ ] Existing transfer mode unaffected
