# Phase 2: Cart-Style Multi-Item UI

**Est. Effort:** 2 days | **Priority:** High | **Risk:** Medium

## Context

Current ProxyPurchaseWizard handles single items in a 2-step flow. For efficiency, proxy agents often purchase multiple items in one shopping session. This phase redesigns the wizard to support cart-style bulk entry.

## Overview

Create ProxyCartWizard - single-screen interface with:
- Client selector at top
- Inline item table with add/edit/delete
- Quick markup buttons per row
- Exchange rate input
- Running totals with profit summary

## Requirements

### Functional
- Select client once, add multiple items
- Each item: description, cost (JPY), markup price, notes
- Quick markup: +10%, +15%, +20% buttons per row
- Running totals: Total Cost, Total Markup, Client Pays (VND), Profit (JPY), Margin %
- Submit creates multiple proxy purchases via API calls
- Minimum 1 item required; no upper limit

### UX (from research)
- Mobile-first: inline editing, tap-friendly controls
- Validation: cost/markup > 0, item description required
- 48x48px minimum tap targets
- Auto-focus on newly added row
- Swipe-to-delete on mobile (optional)

## Implementation Steps

### Step 1: Create ProxyCartWizard Component

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyCartWizard.tsx`

```tsx
interface CartItem {
  id: string // UUID for React key
  item: string
  cost: string // formatted with commas
  markupPrice: string
  notes: string
}

interface ProxyCartWizardProps {
  isOpen: boolean
  onClose: () => void
}

export function ProxyCartWizard({ isOpen, onClose }: ProxyCartWizardProps) {
  // State
  const [clientAccountId, setClientAccountId] = useState<number | null>(null)
  const [items, setItems] = useState<CartItem[]>([createEmptyItem()])
  const [exchangeRate, setExchangeRate] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null)
  const [purchaseDate, setPurchaseDate] = useState(todayISO())

  // Computed totals
  const totals = useMemo(() => calculateTotals(items, exchangeRate), [items, exchangeRate])

  // Submit handler - sequential API calls
  const handleSubmit = async () => {
    for (const item of items) {
      await createProxyPurchase({ ... })
    }
    queryClient.invalidateQueries(['proxy-outstanding', 'transactions', 'accounts'])
    onClose()
  }
}
```

### Step 2: Cart Item Row Component

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyCartItemRow.tsx`

```tsx
interface ProxyCartItemRowProps {
  item: CartItem
  index: number
  onUpdate: (id: string, field: keyof CartItem, value: string) => void
  onDelete: (id: string) => void
  onQuickMarkup: (id: string, percent: number) => void
  showDelete: boolean // hide delete if only 1 item
}

export function ProxyCartItemRow({ item, index, ... }: ProxyCartItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
      {/* Row number */}
      <div className="col-span-1 text-gray-400 text-sm">{index + 1}</div>

      {/* Item description */}
      <div className="col-span-5">
        <Input
          value={item.item}
          onChange={e => onUpdate(item.id, 'item', e.target.value)}
          placeholder="Item name..."
        />
      </div>

      {/* Cost (JPY) */}
      <div className="col-span-2">
        <Input
          value={item.cost}
          onChange={e => onUpdate(item.id, 'cost', formatWithCommas(e.target.value))}
          prefix="¥"
          inputMode="numeric"
        />
      </div>

      {/* Markup Price */}
      <div className="col-span-3">
        <Input
          value={item.markupPrice}
          onChange={e => onUpdate(item.id, 'markupPrice', formatWithCommas(e.target.value))}
          prefix="¥"
        />
        {/* Quick markup buttons */}
        <div className="flex gap-1 mt-1">
          {[10, 15, 20].map(pct => (
            <button
              key={pct}
              onClick={() => onQuickMarkup(item.id, pct)}
              className="text-xs px-1.5 py-0.5 bg-gray-200 rounded"
            >
              +{pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Delete button */}
      <div className="col-span-1">
        {showDelete && (
          <button onClick={() => onDelete(item.id)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        )}
      </div>
    </div>
  )
}
```

### Step 3: Totals Summary Component

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyCartTotals.tsx`

```tsx
interface ProxyCartTotalsProps {
  items: CartItem[]
  exchangeRate: number
}

export function ProxyCartTotals({ items, exchangeRate }: ProxyCartTotalsProps) {
  const totalCost = items.reduce((sum, i) => sum + parseNumber(i.cost), 0)
  const totalMarkup = items.reduce((sum, i) => sum + parseNumber(i.markupPrice), 0)
  const profitJpy = totalMarkup - totalCost
  const clientPaysVnd = totalMarkup * exchangeRate
  const marginPct = totalCost > 0 ? (profitJpy / totalCost * 100) : 0

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Total Cost:</span>
          <span className="font-bold ml-2">¥{totalCost.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600">Total Markup:</span>
          <span className="font-bold ml-2">¥{totalMarkup.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600">Client Pays:</span>
          <span className="font-bold ml-2">₫{clientPaysVnd.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600">Your Profit:</span>
          <span className={cn('font-bold ml-2', profitJpy >= 0 ? 'text-green-600' : 'text-red-600')}>
            ¥{profitJpy.toLocaleString()}
          </span>
        </div>
      </div>
      {/* Margin indicator */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-500">Margin:</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full">
          <div
            className={cn(
              'h-full rounded-full',
              marginPct >= 20 ? 'bg-green-500' : marginPct >= 10 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(100, marginPct)}%` }}
          />
        </div>
        <span className="text-sm font-medium">{marginPct.toFixed(1)}%</span>
      </div>
    </div>
  )
}
```

### Step 4: Mobile Layout Optimization

For mobile (<640px), switch from grid to stacked layout:
- Item name: full width
- Cost + Markup: side by side (50/50)
- Quick markup buttons: below markup input
- Delete: icon in top-right corner

Use Tailwind responsive classes: `grid-cols-12 sm:grid-cols-12` vs `flex flex-col`.

### Step 5: Submit with Sequential API Calls

```tsx
const submitMutation = useMutation({
  mutationFn: async () => {
    const validItems = items.filter(i => i.item && parseNumber(i.cost) > 0)

    for (const item of validItems) {
      await createProxyPurchase({
        client_account_id: clientAccountId!,
        item: item.item,
        cost: parseNumber(item.cost),
        payment_account_id: paymentAccountId!,
        markup_price: parseNumber(item.markupPrice) || parseNumber(item.cost),
        exchange_rate: parseFloat(exchangeRate),
        purchase_date: purchaseDate,
        notes: item.notes || undefined,
      })
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['proxy-outstanding'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    onClose()
  },
})
```

### Step 6: Update FloatingActionButton

Replace ProxyPurchaseWizard with ProxyCartWizard in FAB.

### Step 7: Keep Old Wizard (Optional)

Retain ProxyPurchaseWizard.tsx as fallback or for simple single-item use case. The widget can use either.

## Files Created

| File | Purpose |
|------|---------|
| `frontend/src/components/proxy/ProxyCartWizard.tsx` | Main cart wizard |
| `frontend/src/components/proxy/ProxyCartItemRow.tsx` | Single item row |
| `frontend/src/components/proxy/ProxyCartTotals.tsx` | Totals summary |

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/components/ui/FloatingActionButton.tsx` | Use ProxyCartWizard |
| `frontend/src/components/proxy/ProxyReceivablesWidget.tsx` | Use ProxyCartWizard |

## Success Criteria

1. Can add 5+ items in single session
2. Quick markup buttons correctly calculate cost + percentage
3. Totals update in real-time as items are added/edited
4. Margin indicator shows green/yellow/red based on percentage
5. Submit creates correct number of transactions
6. Mobile layout is usable (tap targets 48px, no horizontal scroll)
7. Validation prevents empty/zero items from submission

## Testing Checklist

- [ ] Add 5 items, verify all appear in cart
- [ ] Use +10% button, verify markup = cost * 1.10
- [ ] Delete item, verify totals recalculate
- [ ] Submit, verify 5 transactions created
- [ ] Test on mobile viewport (375px width)
- [ ] Verify client charge VND calculation

## Performance Notes

- Sequential API calls acceptable for <10 items
- Consider batch endpoint if users add 20+ items regularly
- Debounce input updates for totals calculation (300ms)
