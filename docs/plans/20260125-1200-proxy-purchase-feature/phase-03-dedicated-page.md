# Phase 3: Dedicated /proxy Page

**Est. Effort:** 1.5 days | **Priority:** Medium | **Risk:** Low

## Context

A dedicated page consolidates all proxy business operations: outstanding receivables, purchase history, profit tracking, and client management. This provides a complete business dashboard for proxy agents.

## Overview

Create `/proxy` route with tabbed interface:
1. **Outstanding** - Enhanced receivables widget
2. **History** - Transaction list filtered by proxy categories
3. **Profit** - Monthly profit summary
4. **Clients** - Receivable account list with balances

## Requirements

### Tab 1: Outstanding Receivables
- Full-page version of ProxyReceivablesWidget
- Show all clients with expandable item details
- Quick actions: Settle All, Partial Settle
- Sort by: oldest first, amount, client name

### Tab 2: Purchase History
- Filter transactions by transfer_type: proxy_expense, proxy_receivable, proxy_settled
- Show date, item, cost, markup, client, status
- Status badges: Outstanding, Settled

### Tab 3: Monthly Profit Summary
- Aggregate by month: total cost, total markup, profit, margin %
- Chart: bar chart showing profit trend
- Current month highlighted

### Tab 4: Client List
- List all receivable-type accounts
- Show current balance, item count
- Quick action: View history, New purchase for client

## Implementation Steps

### Step 1: Create Route Files

**File:** `/home/godstorm91/project/smartmoney/frontend/src/routes/proxy.tsx`
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/proxy')({})
```

**File:** `/home/godstorm91/project/smartmoney/frontend/src/routes/proxy.lazy.tsx`
```tsx
import { createLazyFileRoute } from '@tanstack/react-router'
import { ProxyPage } from '@/pages/Proxy'

export const Route = createLazyFileRoute('/proxy')({
  component: ProxyPage,
})
```

### Step 2: Create ProxyPage Component

**File:** `/home/godstorm91/project/smartmoney/frontend/src/pages/Proxy.tsx`

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Clock, TrendingUp, Users } from 'lucide-react'
import { ProxyOutstandingTab } from '@/components/proxy/ProxyOutstandingTab'
import { ProxyHistoryTab } from '@/components/proxy/ProxyHistoryTab'
import { ProxyProfitTab } from '@/components/proxy/ProxyProfitTab'
import { ProxyClientListTab } from '@/components/proxy/ProxyClientListTab'
import { cn } from '@/utils/cn'

type TabId = 'outstanding' | 'history' | 'profit' | 'clients'

export function ProxyPage() {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<TabId>('outstanding')

  const tabs = [
    { id: 'outstanding', icon: Clock, label: t('proxy.tabs.outstanding') },
    { id: 'history', icon: ShoppingCart, label: t('proxy.tabs.history') },
    { id: 'profit', icon: TrendingUp, label: t('proxy.tabs.profit') },
    { id: 'clients', icon: Users, label: t('proxy.tabs.clients') },
  ]

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">{t('proxy.pageTitle')}</h1>
        </div>
        {/* Tab bar */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {activeTab === 'outstanding' && <ProxyOutstandingTab />}
        {activeTab === 'history' && <ProxyHistoryTab />}
        {activeTab === 'profit' && <ProxyProfitTab />}
        {activeTab === 'clients' && <ProxyClientListTab />}
      </div>
    </div>
  )
}
```

### Step 3: Create Tab Components

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyOutstandingTab.tsx`
- Reuse ProxyReceivablesWidget logic
- Add sort controls
- Full-page layout (no Card wrapper)

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyHistoryTab.tsx`
- Query transactions with transfer_type filter
- Table with columns: Date, Client, Item, Cost, Markup, Status
- Status badge component

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyProfitTab.tsx`
- Aggregate transactions by month
- Calculate: sum(proxy_income) - sum(proxy_expense)
- Bar chart using Recharts

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/proxy/ProxyClientListTab.tsx`
- List receivable accounts
- Show balance from account.current_balance
- Link to client history

## Files Created

| File | Purpose |
|------|---------|
| `frontend/src/routes/proxy.tsx` | Route definition |
| `frontend/src/routes/proxy.lazy.tsx` | Lazy route with component |
| `frontend/src/pages/Proxy.tsx` | Main page component |
| `frontend/src/components/proxy/ProxyOutstandingTab.tsx` | Outstanding tab |
| `frontend/src/components/proxy/ProxyHistoryTab.tsx` | History tab |
| `frontend/src/components/proxy/ProxyProfitTab.tsx` | Profit summary tab |
| `frontend/src/components/proxy/ProxyClientListTab.tsx` | Client list tab |

## Success Criteria

1. `/proxy` route accessible and renders page
2. Tab switching works without page reload
3. Outstanding tab shows same data as widget
4. History tab shows all proxy transactions
5. Profit tab shows monthly aggregates with chart
6. Client tab lists all receivable accounts

## Testing Checklist

- [ ] Navigate to /proxy directly
- [ ] All 4 tabs render content
- [ ] Outstanding matches Dashboard widget
- [ ] History shows correct status badges
- [ ] Profit chart renders with data
- [ ] Client list shows correct balances
