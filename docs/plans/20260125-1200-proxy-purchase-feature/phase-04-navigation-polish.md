# Phase 4: Navigation & Polish

**Est. Effort:** 0.5 day | **Priority:** Medium | **Risk:** Low

## Context

Final phase adds navigation entry points and internationalization to make the proxy feature discoverable and accessible to all users.

## Overview

1. Add "Proxy" nav item to BottomNavigation and Header
2. Add complete i18n translations (en, ja, vi)
3. Mobile responsive polish

## Implementation Steps

### Step 1: Add to BottomNavigation

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/layout/BottomNavigation.tsx`

Add to NAV_CONFIG:
```tsx
const NAV_CONFIG: Record<string, NavItemConfig> = {
  // ... existing items
  proxy: {
    path: '/proxy',
    icon: ShoppingCart,
    labelKey: 'nav.proxy',
    activeColor: 'text-orange-600 dark:text-orange-400'
  },
}
```

Add to primaryMenuItems (appears in "More" menu):
```tsx
const primaryMenuItems: NavItemConfig[] = [
  NAV_CONFIG.gamification,
  NAV_CONFIG.analytics,
  NAV_CONFIG.goals,
  NAV_CONFIG.proxy,  // Add here
]
```

Import ShoppingCart from lucide-react.

### Step 2: Add to Header (Desktop Menu)

**File:** `/home/godstorm91/project/smartmoney/frontend/src/components/layout/Header.tsx`

Add to MOBILE_MENU_ITEMS:
```tsx
const MOBILE_MENU_ITEMS: MobileMenuItem[] = [
  // ... existing items
  { path: '/proxy', icon: ShoppingCart, labelKey: 'header.proxy', activeColor: 'text-orange-600' },
]
```

### Step 3: Add i18n Translations

**File:** `/home/godstorm91/project/smartmoney/frontend/src/i18n/locales/en.json`

```json
{
  "nav": {
    "proxy": "Proxy"
  },
  "header": {
    "proxy": "Proxy Business"
  },
  "proxy": {
    "title": "Proxy Purchase",
    "pageTitle": "Proxy Business",
    "tabs": {
      "outstanding": "Outstanding",
      "history": "History",
      "profit": "Profit",
      "clients": "Clients"
    },
    "outstandingReceivables": "Outstanding Receivables",
    "newPurchase": "New Purchase",
    "items": "items",
    "oldestDays": "oldest {{days}}d ago",
    "total": "Total",
    "client": "Client",
    "selectClient": "Select client...",
    "noClients": "No receivable accounts. Create one first.",
    "item": "Item",
    "itemPlaceholder": "Item description...",
    "cost": "Cost (JPY)",
    "paymentMethod": "Payment Method",
    "selectPayment": "Select account...",
    "purchaseDate": "Purchase Date",
    "markupPrice": "Client Price (JPY)",
    "exchangeRate": "Exchange Rate",
    "currentRate": "Current rate",
    "yourCost": "Your cost",
    "clientPays": "Client pays",
    "yourProfit": "Your profit",
    "profitMargin": "Profit margin",
    "notes": "Notes",
    "notesPlaceholder": "Optional notes...",
    "createPurchase": "Create Purchase",
    "step": "Step {{current}}/{{total}}",
    "step1Title": "Purchase Details",
    "step2Title": "Pricing",
    "settleTitle": "Settle Payment",
    "outstanding": "Outstanding",
    "selectItemsToSettle": "Select items to settle",
    "selectAll": "All",
    "selectNone": "None",
    "settlementAmount": "Settlement Amount",
    "receiveTo": "Receive To",
    "selectAccount": "Select account...",
    "amountReceived": "Amount Received (VND)",
    "expected": "Expected",
    "paymentDate": "Payment Date",
    "confirmPayment": "Confirm Payment",
    "cart": {
      "addItem": "Add Item",
      "totalCost": "Total Cost",
      "totalMarkup": "Total Markup",
      "margin": "Margin",
      "createAll": "Create {{count}} Purchases"
    },
    "history": {
      "date": "Date",
      "status": "Status",
      "statusOutstanding": "Outstanding",
      "statusSettled": "Settled"
    },
    "profit": {
      "monthlyProfit": "Monthly Profit",
      "totalProfit": "Total Profit",
      "avgMargin": "Avg Margin"
    },
    "errors": {
      "clientRequired": "Please select a client",
      "itemRequired": "Item description is required",
      "costRequired": "Cost must be greater than 0",
      "paymentRequired": "Please select payment method",
      "markupRequired": "Markup price must be greater than 0",
      "rateRequired": "Exchange rate must be greater than 0",
      "selectItems": "Please select at least one item",
      "receiveRequired": "Please select receive account",
      "amountRequired": "Amount must be greater than 0"
    }
  }
}
```

**File:** `/home/godstorm91/project/smartmoney/frontend/src/i18n/locales/ja.json`

```json
{
  "nav": {
    "proxy": "代行"
  },
  "header": {
    "proxy": "代行購入"
  },
  "proxy": {
    "title": "代行購入",
    "pageTitle": "代行ビジネス",
    "tabs": {
      "outstanding": "未回収",
      "history": "履歴",
      "profit": "利益",
      "clients": "顧客"
    },
    "outstandingReceivables": "未回収金",
    "newPurchase": "新規購入",
    "items": "件",
    "oldestDays": "最古 {{days}}日前",
    "total": "合計",
    "client": "顧客",
    "selectClient": "顧客を選択...",
    "item": "商品",
    "cost": "原価 (円)",
    "markupPrice": "販売価格 (円)",
    "exchangeRate": "為替レート",
    "clientPays": "顧客支払額",
    "yourProfit": "利益",
    "profitMargin": "利益率",
    "createPurchase": "購入を作成"
  }
}
```

**File:** `/home/godstorm91/project/smartmoney/frontend/src/i18n/locales/vi.json`

```json
{
  "nav": {
    "proxy": "Mua ho"
  },
  "header": {
    "proxy": "Mua ho"
  },
  "proxy": {
    "title": "Mua ho",
    "pageTitle": "Kinh doanh mua ho",
    "tabs": {
      "outstanding": "Chua thanh toan",
      "history": "Lich su",
      "profit": "Loi nhuan",
      "clients": "Khach hang"
    },
    "outstandingReceivables": "Cong no",
    "newPurchase": "Mua moi",
    "items": "mon",
    "total": "Tong",
    "client": "Khach hang",
    "cost": "Gia goc (JPY)",
    "markupPrice": "Gia ban (JPY)",
    "clientPays": "Khach tra",
    "yourProfit": "Loi nhuan",
    "createPurchase": "Tao don mua"
  }
}
```

### Step 4: Mobile Responsive Polish

Verify all proxy components work on 375px viewport:
- ProxyCartWizard: stacked layout on mobile
- ProxyPage tabs: horizontal scroll if needed
- ProxyReceivablesWidget: touch-friendly tap targets

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/components/layout/BottomNavigation.tsx` | Add proxy nav item |
| `frontend/src/components/layout/Header.tsx` | Add proxy menu item |
| `frontend/src/i18n/locales/en.json` | Add proxy translations |
| `frontend/src/i18n/locales/ja.json` | Add proxy translations |
| `frontend/src/i18n/locales/vi.json` | Add proxy translations |

## Success Criteria

1. "Proxy" appears in mobile More menu with ShoppingCart icon
2. "Proxy" appears in desktop header menu
3. Navigation highlights correctly when on /proxy
4. All proxy UI text is translated in 3 languages
5. Mobile layout works without horizontal scroll

## Testing Checklist

- [ ] Bottom nav More menu shows Proxy item
- [ ] Header mobile menu shows Proxy item
- [ ] Click nav item navigates to /proxy
- [ ] Switch to Japanese, verify translations
- [ ] Switch to Vietnamese, verify translations
- [ ] Test on 375px viewport width
