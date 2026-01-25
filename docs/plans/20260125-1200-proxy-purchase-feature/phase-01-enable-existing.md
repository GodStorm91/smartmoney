# Phase 1: Enable Existing Components

**Est. Effort:** 0.5 day | **Priority:** High | **Risk:** Low

## Context

Proxy components exist but are not integrated into the app. This phase wires up existing functionality with minimal changes - quick wins that enable the core workflow.

## Overview

1. Add ProxyReceivablesWidget to Dashboard (prominent position, top section)
2. Add "Proxy Purchase" action to FloatingActionButton menu
3. Ensure modals work correctly when triggered from FAB

## Requirements

- ProxyReceivablesWidget appears on Dashboard when outstanding receivables exist
- FAB shows "Proxy Purchase" option that opens ProxyPurchaseWizard
- Widget shows client list with totals, clicking opens settlement modal
- No new components created; only integration work

## Implementation Steps

### Step 1: Add ProxyReceivablesWidget to Dashboard

**File:** `/home/godstorm91/project/smartmoney/frontend/src/pages/Dashboard.tsx`

```tsx
// Add import at top
import { ProxyReceivablesWidget } from '@/components/proxy/ProxyReceivablesWidget'

// In Dashboard component, after OnboardingChecklist:
<OnboardingChecklist />

{/* Proxy Receivables - prominent position for business tracking */}
<ProxyReceivablesWidget />

{/* Net Worth Hero */}
<NetWorthHero summary={summary} />
```

### Step 2: Add Proxy Purchase to FloatingActionButton

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/ui/FloatingActionButton.tsx`

```tsx
// Add import
import { ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { ProxyPurchaseWizard } from '@/components/proxy/ProxyPurchaseWizard'

// Inside FloatingActionButton component:
const [showProxyWizard, setShowProxyWizard] = useState(false)

// Add to actions array:
{
  icon: <ShoppingCart size={20} />,
  label: t('proxy.title', 'Proxy Purchase'),
  onClick: () => {
    setIsOpen(false)
    setShowProxyWizard(true)
  },
  color: 'bg-orange-500 hover:bg-orange-600',
},

// After closing tag of FAB Container div:
<ProxyPurchaseWizard
  isOpen={showProxyWizard}
  onClose={() => setShowProxyWizard(false)}
/>
```

### Step 3: Add i18n Keys for Proxy

**File:** `/home/godstorm91/project/smartmoney/frontend/src/i18n/locales/en.json`

Add under `proxy` key (verify existing keys, add if missing):
```json
{
  "proxy": {
    "title": "Proxy Purchase",
    "outstandingReceivables": "Outstanding Receivables",
    "newPurchase": "New Purchase",
    "items": "items",
    "oldestDays": "oldest {{days}}d ago",
    "total": "Total"
  }
}
```

Repeat for `ja.json` and `vi.json`.

### Step 4: Verify Widget Query Integration

Ensure `proxy-outstanding` query key matches in:
- `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyReceivablesWidget.tsx`
- `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyPurchaseWizard.tsx`
- `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxySettlementModal.tsx`

All should invalidate `['proxy-outstanding']` on mutation success.

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/pages/Dashboard.tsx` | Import + add ProxyReceivablesWidget |
| `frontend/src/components/ui/FloatingActionButton.tsx` | Add proxy action + wizard |
| `frontend/src/i18n/locales/en.json` | Add proxy translations |
| `frontend/src/i18n/locales/ja.json` | Add proxy translations |
| `frontend/src/i18n/locales/vi.json` | Add proxy translations |

## Success Criteria

1. Dashboard shows ProxyReceivablesWidget when outstanding receivables exist
2. Widget is hidden when no receivables (clean dashboard for non-proxy users)
3. FAB on mobile shows "Proxy Purchase" option with ShoppingCart icon
4. Clicking FAB option opens ProxyPurchaseWizard modal
5. Creating purchase invalidates queries and updates widget
6. Clicking client in widget opens settlement modal
7. Settling payment updates widget and removes cleared items

## Testing Checklist

- [ ] Create receivable account (e.g., "Receivable: Tuan")
- [ ] Create proxy purchase via FAB
- [ ] Verify Dashboard shows widget with new receivable
- [ ] Click client to open settlement modal
- [ ] Complete settlement and verify widget updates
- [ ] Verify empty widget hides on Dashboard

## Rollback Plan

Remove ProxyReceivablesWidget import from Dashboard and proxy action from FAB. No database changes required.
