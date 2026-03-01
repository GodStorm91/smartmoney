# Budget UI Phase 3 Implementation Plan

**Date:** 2026-01-25
**Status:** Ready for Implementation
**Priority:** Desktop-first (with responsive fallback)
**Scope:** Phase 3 - Desktop Tabbed Interface + Predictive Overspending Warnings
**Estimated Duration:** 2-3 weeks

---

## Problem Statement

Budget page currently uses single-view vertical scroll layout optimized for mobile. Desktop users lack:
- Tab-based navigation for quick section switching
- Split-view category management (list + detail)
- Predictive overspending warnings before budgets exceed

**Phase 1 & 2 Complete:**
- Status badges, trend-based daily pace, donut chart
- Spending alerts, ARIA accessibility, confirmation dialogs

---

## Phase 3 Features

### Feature 1: Desktop Tabbed Interface with Split-View
Transform single-view scroll into tabbed navigation with master-detail pattern on desktop.

### Feature 2: Predictive Overspending Warnings
ML-lite predictions using moving average + anomaly detection with batched alerts.

---

## Detailed Task Breakdown

### Task 3.1: Tab Navigation Container
**File:** `frontend/src/components/budget/budget-tabs-container.tsx` (NEW)
**Story Points:** 3

Create horizontal tab navigation using shadcn/ui Tabs pattern.

```
Desktop (1024px+):
+----------------------------------------------------------+
| [Overview] [Categories] [Transactions] [Forecast]        |
+----------------------------------------------------------+
|                                                          |
|                    Tab Content Area                      |
|                                                          |
+----------------------------------------------------------+

Mobile (< 768px):
+---------------------------+
| [Overview v]              |  <-- Accordion/dropdown
+---------------------------+
|                           |
|   Content                 |
|                           |
+---------------------------+
```

**Implementation:**
```tsx
// Use existing shadcn/ui tabs pattern or create custom
interface BudgetTabsContainerProps {
  defaultTab?: 'overview' | 'categories' | 'transactions' | 'forecast'
  children: React.ReactNode
}

// Tab triggers
<TabsList className="hidden md:flex">
  <TabsTrigger value="overview">{t('budget.tabs.overview')}</TabsTrigger>
  <TabsTrigger value="categories">{t('budget.tabs.categories')}</TabsTrigger>
  <TabsTrigger value="transactions">{t('budget.tabs.transactions')}</TabsTrigger>
  <TabsTrigger value="forecast">{t('budget.tabs.forecast')}</TabsTrigger>
</TabsList>
```

**Acceptance Criteria:**
- [ ] 4 tabs: Overview, Categories, Transactions, Forecast
- [ ] Tab state persisted in URL (query param or route)
- [ ] Keyboard navigation (Arrow keys, Tab/Shift+Tab)
- [ ] Active tab visually distinct (underline or background)
- [ ] ARIA: role="tablist", aria-selected, aria-controls

---

### Task 3.2: Overview Tab Content
**File:** `frontend/src/components/budget/tabs/overview-tab.tsx` (NEW)
**Story Points:** 2

Refactor existing Budget.tsx content into Overview tab. Contains:
- Health status banner
- BudgetProjectionCard
- BudgetDonutChart
- Quick stats grid (income, savings, remaining)
- Spending progress bar

```
+----------------------------------------------------------+
| Budget Health Banner                                      |
| [On Track] ¥150,000 / ¥200,000 (75%)                    |
+----------------------------------------------------------+
| +----------------------+  +---------------------------+  |
| | Projection Card      |  | Donut Chart              |  |
| | Safe: ¥5,000/day    |  |     [Chart]              |  |
| +----------------------+  +---------------------------+  |
|                                                          |
| +--------+ +--------+ +--------+                         |
| | Income | | Savings| | Remain |                        |
| +--------+ +--------+ +--------+                         |
+----------------------------------------------------------+
```

---

### Task 3.3: Categories Tab with Split-View
**File:** `frontend/src/components/budget/tabs/categories-tab.tsx` (NEW)
**Story Points:** 5

Master-detail layout: category list (left) + category detail (right).

```
Desktop (lg+):
+----------------------------------------------------------+
|  Category List (280px)  |  Category Details (flex)       |
+-------------------------+--------------------------------+
| + Add Category          |  Groceries                     |
+-------------------------+  Budget: ¥50,000               |
| > Groceries     ✅ 65%  |  Spent:  ¥32,450               |
|   Transport     ⚠️ 85%  |  [====65%====      ]           |
|   Utilities     ✅ 45%  |                                |
|   Entertainment 🚨 110% |  Transactions (Top 10)         |
|   ...                   |  +---------------------------+ |
|                         |  | Jan 25 | Supermarket | ¥3k| |
|                         |  | Jan 23 | Combini    | ¥800| |
|                         |  +---------------------------+ |
+-------------------------+--------------------------------+

Mobile (< lg):
+---------------------------+
| > Groceries     ✅ 65%    | <-- Tap to expand
+---------------------------+
|   Budget: ¥50,000         |
|   Spent:  ¥32,450         |
|   [====65%====      ]     |
|   Transactions...         |
+---------------------------+
| > Transport     ⚠️ 85%    |
+---------------------------+
```

**Implementation:**
```tsx
// Desktop: grid with fixed left, fluid right
<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
  {/* Left Panel: Category List */}
  <div className="border-r overflow-y-auto max-h-[calc(100vh-200px)]">
    <CategoryListPanel
      categories={allocations}
      tracking={tracking}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
    />
  </div>

  {/* Right Panel: Category Details (desktop only) */}
  <div className="hidden lg:block overflow-y-auto">
    {selectedCategory && (
      <CategoryDetailPanel
        category={selectedCategory}
        month={selectedMonth}
        trackingItem={getTrackingItem(selectedCategory)}
      />
    )}
  </div>
</div>
```

**Mobile Behavior:**
- No split view - use existing accordion pattern
- Category tap expands inline (AllocationCard)
- Reuse existing mobile components

---

### Task 3.4: Category List Panel
**File:** `frontend/src/components/budget/category-list-panel.tsx` (NEW)
**Story Points:** 2

Compact category list for left panel with status indicators.

```tsx
interface CategoryListPanelProps {
  categories: BudgetAllocation[]
  tracking?: BudgetTracking
  selectedCategory: string | null
  onSelectCategory: (category: string) => void
  isDraft?: boolean
  onAddCategory?: () => void
}
```

**Features:**
- [ ] Compact list items (category name + mini status badge + %)
- [ ] Selected state highlight (left border + background)
- [ ] Keyboard navigation within list (ArrowUp/Down)
- [ ] "Add Category" button at top (draft mode only)
- [ ] Overflow scroll with scrollbar-hide

---

### Task 3.5: Category Detail Panel (Enhanced)
**File:** `frontend/src/components/budget/category-detail-panel.tsx` (MODIFY)
**Story Points:** 3

Enhance existing BudgetDetailPanel for inline display (not slide-over).

**Changes:**
- [ ] Support both inline (split-view) and slide-over modes
- [ ] Add `mode: 'inline' | 'overlay'` prop
- [ ] Inline mode: no fixed positioning, no backdrop
- [ ] Add month-over-month comparison chart (mini bar)
- [ ] Add quick edit budget amount (draft mode)

```tsx
interface CategoryDetailPanelProps {
  category: string
  month: string
  trackingItem?: BudgetTrackingItem
  mode?: 'inline' | 'overlay'  // NEW
  isOpen?: boolean             // Only for overlay mode
  onClose?: () => void         // Only for overlay mode
}
```

---

### Task 3.6: Transactions Tab
**File:** `frontend/src/components/budget/tabs/transactions-tab.tsx` (NEW)
**Story Points:** 3

Full transaction list with filtering and sorting.

```
+----------------------------------------------------------+
| Filter: [All Categories v]  [Expense v]  Search: [____]  |
+----------------------------------------------------------+
| Date       | Description          | Category  | Amount   |
+------------|----------------------|-----------|----------|
| Jan 25     | Supermarket ABC      | Groceries | ¥3,200   |
| Jan 24     | JR Train             | Transport | ¥580     |
| Jan 23     | Electricity          | Utilities | ¥8,500   |
| ...        | ...                  | ...       | ...      |
+----------------------------------------------------------+
| Showing 1-20 of 156                   [< 1 2 3 4 5 >]   |
+----------------------------------------------------------+
```

**Features:**
- [ ] Category filter dropdown
- [ ] Transaction type filter (expense/income/all)
- [ ] Search by description
- [ ] Sortable columns (date, amount)
- [ ] Pagination (20 per page)
- [ ] Click row to edit transaction

---

### Task 3.7: Forecast Tab with Predictions
**File:** `frontend/src/components/budget/tabs/forecast-tab.tsx` (NEW)
**Story Points:** 5

Contains predictive overspending warnings and projections.

```
+----------------------------------------------------------+
| Spending Forecast - January 2026                          |
+----------------------------------------------------------+
|                                                          |
| +------------------------------------------------------+ |
| | Predicted Overspend Warnings                         | |
| +------------------------------------------------------+ |
| | ⚠️ Groceries predicted to exceed by ¥8,000           | |
| |    Current pace: ¥4,200/day | Safe: ¥3,100/day       | |
| |    [View] [Adjust Budget]                            | |
| +------------------------------------------------------+ |
| | ⚠️ Entertainment may exceed (78% confidence)         | |
| |    Unusual spending detected on Jan 20              | |
| +------------------------------------------------------+ |
|                                                          |
| +----------------------+  +---------------------------+  |
| | Projection Chart     |  | Category Forecasts       |  |
| | [Line chart]         |  | Groceries: ¥58k/¥50k    |  |
| |                      |  | Transport: ¥18k/¥20k    |  |
| +----------------------+  +---------------------------+  |
+----------------------------------------------------------+
```

---

### Task 3.8: Predictive Spending Calculation Engine
**File:** `frontend/src/utils/spending-prediction.ts` (NEW)
**Story Points:** 5

ML-lite prediction using moving average + simple anomaly detection.

```typescript
interface SpendingPrediction {
  category: string
  predictedTotal: number
  budgetAmount: number
  exceededBy: number
  confidence: 'high' | 'medium' | 'low'
  status: 'safe' | 'warning' | 'danger'
  dailyPace: number
  safeDailyPace: number
  anomalyDetected?: boolean
  anomalyDescription?: string
}

// Moving average prediction
function predictCategorySpending(
  category: string,
  historicalData: DailySpending[],
  daysRemaining: number
): SpendingPrediction

// Simple anomaly detection (2-sigma rule)
function detectSpendingAnomaly(
  dailyAmounts: number[],
  currentAmount: number
): { isAnomaly: boolean; description: string }

// Batch all category predictions
function generatePredictions(
  allocations: BudgetAllocation[],
  tracking: BudgetTracking,
  historicalData: CategoryHistory[]
): SpendingPrediction[]
```

**Algorithm (ML-lite):**
```typescript
// 1. Calculate daily spending pace
const daysElapsed = Math.max(1, currentDay)
const dailyPace = totalSpent / daysElapsed

// 2. Project month-end total
const predictedTotal = totalSpent + (dailyPace * daysRemaining)

// 3. Anomaly detection (2-sigma rule)
const mean = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length
const std = Math.sqrt(
  dailyAmounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / dailyAmounts.length
)
const threshold = mean + (2 * std)
const isAnomaly = currentAmount > threshold

// 4. Confidence level
const confidence = daysElapsed >= 15 ? 'high' : daysElapsed >= 7 ? 'medium' : 'low'
```

---

### Task 3.9: Predictive Alerts Component
**File:** `frontend/src/components/budget/predictive-alert.tsx` (NEW)
**Story Points:** 3

Display batch predictive warnings with actionable buttons.

```tsx
interface PredictiveAlertProps {
  predictions: SpendingPrediction[]
  onViewCategory: (category: string) => void
  onAdjustBudget: (category: string) => void
  maxAlerts?: number  // Default: 3
}
```

**Alert Types:**
1. **Predicted Overspend** (Red): Category will exceed budget
2. **Warning** (Yellow): Category approaching limit at current pace
3. **Anomaly Detected** (Purple): Unusual spending spike

```
+----------------------------------------------------------+
| ⚠️ Predicted Overspend                                   |
| Groceries will exceed budget by ¥8,000                   |
| Current pace: ¥4,200/day | Need: ¥3,100/day to stay safe |
| Confidence: High (15+ days data)                         |
|                              [View Details] [Adjust]     |
+----------------------------------------------------------+
```

---

### Task 3.10: Backend API for Historical Data
**File:** `backend/app/routes/budget.py` (MODIFY)
**Story Points:** 3

New endpoint for historical spending data needed for predictions.

```python
@router.get("/budget/history/{category}")
async def get_category_spending_history(
    category: str,
    months: int = Query(default=3, le=12),  # Last N months
    db: Session = Depends(get_db)
) -> CategoryHistoryResponse:
    """
    Get daily spending history for a category.
    Used for prediction calculations.
    """
    return {
        "category": category,
        "daily_spending": [
            {"date": "2026-01-25", "amount": 3200},
            {"date": "2026-01-24", "amount": 2800},
            ...
        ],
        "monthly_totals": [
            {"month": "2026-01", "total": 48000},
            {"month": "2025-12", "total": 52000},
            ...
        ]
    }
```

---

### Task 3.11: Responsive Transition Strategy
**File:** Multiple files
**Story Points:** 2

Ensure seamless transition between breakpoints.

**Breakpoints:**
- **Mobile** (< 768px): Accordion pattern, no tabs, single column
- **Tablet** (768px - 1023px): Horizontal scrollable tabs, no split-view
- **Desktop** (1024px+): Fixed tabs, split-view for Categories tab

**Implementation:**
```tsx
// Tab visibility
<TabsList className="hidden md:flex">  {/* Hide on mobile */}

// Mobile fallback
<div className="md:hidden">
  <MobileAccordionNav activeTab={activeTab} onTabChange={setActiveTab} />
</div>

// Split-view responsive
<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
  {/* Mobile: single column, Desktop: split */}
</div>
```

---

### Task 3.12: Tab State Persistence
**File:** `frontend/src/hooks/useBudgetTabState.ts` (NEW)
**Story Points:** 2

Persist active tab in URL and localStorage.

```typescript
function useBudgetTabState() {
  // Read from URL query param first, then localStorage
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const storedTab = localStorage.getItem('budget-active-tab')

  const [activeTab, setActiveTab] = useState<string>(
    urlTab || storedTab || 'overview'
  )

  // Sync to URL on change
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', activeTab)
    window.history.replaceState({}, '', url)
    localStorage.setItem('budget-active-tab', activeTab)
  }, [activeTab])

  return { activeTab, setActiveTab }
}
```

---

### Task 3.13: Keyboard Navigation Enhancement
**File:** `frontend/src/components/budget/budget-tabs-container.tsx`
**Story Points:** 2

Full keyboard support for tabs and split-view navigation.

**Keyboard Shortcuts:**
- `Tab` / `Shift+Tab`: Navigate between tabs
- `ArrowLeft` / `ArrowRight`: Switch tabs (when tab focused)
- `ArrowUp` / `ArrowDown`: Navigate category list (split-view)
- `Enter` / `Space`: Select focused item
- `Escape`: Close overlay panels

---

## UI Mockups (ASCII Art)

### Desktop Full Layout (1024px+)

```
+------------------------------------------------------------------+
| SmartMoney                                    [?] [Settings] [?]  |
+------------------------------------------------------------------+
| < January 2026 >                                                  |
| Budget                                                            |
| Plan and track your monthly spending                              |
+------------------------------------------------------------------+
| [Overview] [Categories] [Transactions] [Forecast]                 |
+------------------------------------------------------------------+
|                                                                   |
| +------------------+ +----------------------------------------+   |
| | CATEGORY LIST    | | CATEGORY DETAILS                      |   |
| +------------------+ +----------------------------------------+   |
| | + Add Category   | | Groceries                       [Edit] |   |
| |------------------| | Budget: ¥50,000                        |   |
| | > Groceries  ✅  | | Spent:  ¥32,450   (65%)               |   |
| |   ¥32k/¥50k 65%  | | [=============----------]              |   |
| |------------------| |                                        |   |
| |   Transport  ⚠️  | | Month-over-Month                       |   |
| |   ¥17k/¥20k 85%  | | Dec: ¥48,200 | Jan: ¥32,450 (-33%)    |   |
| |------------------| |                                        |   |
| |   Utilities  ✅  | | Top Transactions                       |   |
| |   ¥9k/¥20k  45%  | | +------------------------------------+ |   |
| |------------------| | | Jan 25 | Supermarket    | ¥3,200  | |   |
| |   Entertain 🚨   | | | Jan 23 | Combini        | ¥800    | |   |
| |   ¥22k/¥20k 110% | | | Jan 21 | Organic Store  | ¥4,500  | |   |
| |                  | | +------------------------------------+ |   |
| +------------------+ +----------------------------------------+   |
|                                                                   |
+------------------------------------------------------------------+
```

### Forecast Tab with Predictions

```
+------------------------------------------------------------------+
| [Overview] [Categories] [Transactions] [*Forecast*]              |
+------------------------------------------------------------------+
|                                                                   |
| Spending Forecast - January 2026                                  |
| Based on your current spending pace                               |
|                                                                   |
| +---------------------------------------------------------------+ |
| | PREDICTED OVERSPEND WARNINGS                                   | |
| +---------------------------------------------------------------+ |
| | ⚠️ Groceries predicted to exceed by ¥8,000                    | |
| |   Current: ¥4,200/day | Safe: ¥3,100/day | 15 days remaining  | |
| |   Confidence: High                      [View] [Adjust Budget] | |
| +---------------------------------------------------------------+ |
| | ⚠️ Entertainment spending anomaly detected                     | |
| |   ¥12,000 on Jan 20 (3x normal daily average)                 | |
| |   Confidence: Medium                    [View] [Dismiss]       | |
| +---------------------------------------------------------------+ |
|                                                                   |
| +----------------------------+ +-------------------------------+  |
| | Projection Chart           | | Category Forecasts            |  |
| |                            | +-------------------------------+  |
| |    /~~~~~~__               | | Category    | Forecast | Bgt  |  |
| |   /        \__             | |-------------|----------|------|  |
| |  /            \__budget    | | Groceries   | ¥58,000  |¥50k  |  |
| | Day 1    15    30          | | Transport   | ¥18,000  |¥20k  |  |
| +----------------------------+ | Utilities   | ¥18,500  |¥20k  |  |
|                               | Entertainment| ¥28,000  |¥20k  |  |
|                               +-------------------------------+  |
+------------------------------------------------------------------+
```

### Mobile Layout (< 768px)

```
+---------------------------+
| < January 2026 >          |
| Budget                    |
+---------------------------+
| Tab: [Overview      v]    |
+---------------------------+
|                           |
| [On Track] 75% used       |
| ¥150k / ¥200k             |
|                           |
| +----------------------+  |
| | Daily Pace           |  |
| | Current: ¥5,000/day  |  |
| | Safe:    ¥4,200/day  |  |
| +----------------------+  |
|                           |
| +----------------------+  |
| |    [Donut Chart]     |  |
| |    ¥50k remaining    |  |
| +----------------------+  |
|                           |
| +--------+ +--------+     |
| | Income | | Savings|     |
| | ¥300k  | | ¥50k   |     |
| +--------+ +--------+     |
|                           |
+---------------------------+
```

---

## File Changes Summary

### New Files
```
frontend/src/components/budget/
├── budget-tabs-container.tsx      (Task 3.1)
├── category-list-panel.tsx        (Task 3.4)
├── predictive-alert.tsx           (Task 3.9)
├── tabs/
│   ├── overview-tab.tsx           (Task 3.2)
│   ├── categories-tab.tsx         (Task 3.3)
│   ├── transactions-tab.tsx       (Task 3.6)
│   └── forecast-tab.tsx           (Task 3.7)

frontend/src/utils/
└── spending-prediction.ts         (Task 3.8)

frontend/src/hooks/
└── useBudgetTabState.ts          (Task 3.12)

backend/app/routes/
└── budget.py                      (Task 3.10 - MODIFY)
```

### Modified Files
```
frontend/src/pages/
└── Budget.tsx                     (Task 3.1, 3.11 - Major refactor)

frontend/src/components/budget/
├── budget-detail-panel.tsx        (Task 3.5 - Add inline mode)
└── spending-alert.tsx             (Task 3.9 - Integrate predictive)

frontend/src/locales/
├── en/common.json                 (New translation keys)
└── ja/common.json                 (New translation keys)
```

---

## Mobile-First Responsive Specifications

### Breakpoints
| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, accordion, no tabs |
| Tablet | 768px - 1023px | Horizontal scrollable tabs, no split |
| Desktop | 1024px+ | Fixed tabs, split-view |

### Touch Targets
- Tab buttons: 48px min height, 16px horizontal padding
- Category list items: 48px min height
- Action buttons: 44x44px minimum

### Typography (Mobile)
- Tab label: 14px medium
- Category name: 14px semibold
- Amount: 18px bold
- Secondary text: 12px regular

---

## Testing Checklist

### Functional Tests
- [ ] Tab switching updates content correctly
- [ ] Tab state persists on page refresh
- [ ] Category selection in split-view works
- [ ] Predictions calculate accurately (test with mock data)
- [ ] Anomaly detection flags correct outliers
- [ ] Alerts respect maxAlerts limit

### Responsive Tests
- [ ] Mobile: No tabs visible, accordion works
- [ ] Tablet: Tabs scroll horizontally
- [ ] Desktop: Split-view displays correctly
- [ ] Resize transitions smooth between breakpoints

### Accessibility Tests
- [ ] Keyboard navigation through all tabs
- [ ] Tab order logical (left to right, top to bottom)
- [ ] Screen reader announces tab changes
- [ ] Focus visible on all interactive elements
- [ ] Color contrast WCAG AA (4.5:1 for text)

### Performance Tests
- [ ] Tab switch < 100ms
- [ ] Prediction calculation < 200ms
- [ ] Initial load < 600ms
- [ ] No layout shift on tab change

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to switch sections | N/A (scroll) | < 1s (tab click) |
| Desktop usability score | Baseline | +40% |
| Prediction accuracy | N/A | >80% within 10% margin |
| Alert actionability | Baseline | >60% click-through |
| Accessibility score | 95 | 98+ |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Prediction accuracy with limited data | Show confidence level, fallback to simple pace |
| Tab transition performance | Lazy load tab content, skeleton states |
| Split-view responsiveness | Use CSS grid, avoid JS-based sizing |
| Alert fatigue from predictions | Max 3 alerts, dismissible, weekly batch option |

---

## Implementation Order

```
Week 1:
├── Task 3.1: Tab navigation container (foundation)
├── Task 3.2: Overview tab (refactor existing)
├── Task 3.11: Responsive transitions
└── Task 3.12: Tab state persistence

Week 2:
├── Task 3.3: Categories tab with split-view
├── Task 3.4: Category list panel
├── Task 3.5: Enhanced detail panel
└── Task 3.6: Transactions tab

Week 3:
├── Task 3.8: Prediction calculation engine
├── Task 3.9: Predictive alerts component
├── Task 3.7: Forecast tab
├── Task 3.10: Backend API for history
└── Task 3.13: Keyboard navigation

Testing & Polish:
├── Unit tests for prediction logic
├── Integration tests for tab navigation
├── Accessibility audit
└── Performance optimization
```

---

## Story Points Summary

| Task | Points | Category |
|------|--------|----------|
| 3.1 Tab Container | 3 | UI |
| 3.2 Overview Tab | 2 | UI |
| 3.3 Categories Tab | 5 | UI |
| 3.4 Category List Panel | 2 | UI |
| 3.5 Detail Panel (Enhance) | 3 | UI |
| 3.6 Transactions Tab | 3 | UI |
| 3.7 Forecast Tab | 5 | UI |
| 3.8 Prediction Engine | 5 | Logic |
| 3.9 Predictive Alerts | 3 | UI |
| 3.10 Backend API | 3 | Backend |
| 3.11 Responsive Strategy | 2 | UI |
| 3.12 Tab State Persistence | 2 | State |
| 3.13 Keyboard Navigation | 2 | A11y |
| **Total** | **40** | |

**Estimated Duration:** 2-3 weeks (1 developer)

---

## Dependencies

### External
- shadcn/ui Tabs component (may need to add)
- Existing Recharts library for charts

### Internal
- BudgetDetailPanel (existing, needs modification)
- SpendingAlert (existing, integrate predictive)
- AllocationCard (existing, use for mobile)

---

## Unresolved Questions

1. **Tab Labels in Japanese:** Should use abbreviated names for tablet (e.g., "概要" vs "月次概要")?

2. **Historical Data Range:** How many months of history to fetch for predictions? (Recommendation: 3 months default, configurable)

3. **Prediction Frequency:** Calculate on page load only or real-time as transactions added? (Recommendation: Page load + manual refresh button)

4. **Split-View Resize:** Should split-view be user-resizable with drag handle? (Recommendation: Fixed proportions for MVP)

5. **Mobile Tab Style:** Dropdown select vs. bottom tab bar vs. accordion? (Recommendation: Dropdown select for consistency)

---

**Ready for implementation. Approve to proceed.**
