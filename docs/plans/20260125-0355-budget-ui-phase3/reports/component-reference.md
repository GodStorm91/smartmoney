# Budget Component Reference Guide - Phase 3

## Key Components Overview with Code Examples

---

## 1. AllocationCard (Desktop Expandable Card)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/allocation-card.tsx`

**Purpose**: Main category card component with:
- Mobile accordion expand/collapse
- Desktop "View Details" button opening side panel
- Allocation & spending progress bars
- Budget status tracking

**Key Props**:
```typescript
allocation: BudgetAllocation                    // Category data
trackingItem?: BudgetTrackingItem              // Current spending data
totalBudget: number                            // Total budget for percentage
month: string                                  // Format: "YYYY-MM"
isExpanded: boolean                            // Mobile accordion state
onToggleExpand: (category: string) => void    // Expand/collapse handler
onOpenDetail: (category: string) => void      // Open detail panel
```

**Mobile Behavior**:
```tsx
// Accordion content (hidden by default on mobile)
<div className="lg:hidden transition-all duration-300 ease-out"
  isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'>
  <TransactionSection ... />
</div>
```

**Desktop Behavior**:
```tsx
// Info button that opens side panel
<div className="hidden lg:flex px-4 pb-3">
  <button onClick={() => onOpenDetail(allocation.category)}>
    <Info className="w-4 h-4" />
    <span>{t('viewDetails')}</span>
  </button>
</div>
```

---

## 2. BudgetDetailPanel (Side Panel Detail View)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-detail-panel.tsx`

**Purpose**: Slide-in panel showing:
- Category spending vs budget
- Progress bar with status color
- Month-over-month comparison
- Top 10 transactions
- Add transaction button

**Key Props**:
```typescript
category: string                      // Category name to display
month: string                        // "YYYY-MM" format
trackingItem?: BudgetTrackingItem   // Budget/spent data
isOpen: boolean                      // Panel visibility
onClose: () => void                 // Close handler
```

**Layout Structure**:
```tsx
// Responsive width:
// Mobile: full width (w-full)
// Tablet+: 384px (sm:w-96)
className="fixed right-0 top-0 h-full w-full sm:w-96"

// Mobile backdrop (hidden on lg+)
className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 lg:hidden"
```

**Data Fetching**:
```tsx
// Current month transactions (top 10 by amount in JPY)
useEffect(() => {
  const data = await fetchTransactions({
    categories: searchCategories,
    start_date: startDate,
    end_date: endDate,
    type: 'expense'
  })
  // Convert to JPY, sort, take top 10
}, [category, month, isOpen])

// Previous month total for comparison
useEffect(() => {
  // Fetch prev month, calculate total in JPY
  setPreviousMonthSpent(total)
}, [category, month, isOpen])
```

---

## 3. BudgetAllocationList (Main Allocation Container)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-allocation-list.tsx`

**Purpose**: Main allocation list with:
- Sorting (priority, amount, category, percentage)
- Grouping (none, needs-wants-savings)
- Quick adjustment buttons (draft mode)
- Maps to AllocationCard grid

**Key Props**:
```typescript
budgetId: number
allocations: BudgetAllocation[]
totalBudget: number
tracking?: BudgetTracking
isDraft?: boolean
onAddCategory?: () => void
onAllocationChange?: (updatedAllocations: BudgetAllocation[]) => void
```

**Sorting/Grouping UI**:
```tsx
// Group dropdown
<select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
  <option value="none">{t('budget.groupNone')}</option>
  <option value="needs-wants">{t('budget.groupNeedsWants')}</option>
</select>

// Sort toggle buttons
<button onClick={() => toggleSort('priority')}>
  {t('budget.sortPriority')}
</button>
<button onClick={() => toggleSort('amount')}>
  {t('budget.sortAmount')}
</button>
```

**Grouping Logic**:
```tsx
const categorizeAllocation = (allocation: BudgetAllocation): 'need' | 'want' | 'savings' => {
  const category = allocation.category.toLowerCase()
  const needsKeywords = ['housing', 'rent', 'utilities', 'insurance', 'groceries', ...]
  const savingsKeywords = ['savings', 'investment', 'retirement', 'emergency', ...]
  
  if (savingsKeywords.some(k => category.includes(k))) return 'savings'
  if (needsKeywords.some(k => category.includes(k))) return 'need'
  return 'want'
}
```

---

## 4. BudgetProjectionCard (Spending Forecast)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-projection-card.tsx`

**Purpose**: Displays:
- Days remaining in month
- Current daily spending pace
- Safe daily pace (to stay on budget)
- Projected total spending
- Status badge (on track/warning/danger)

**Key Props**:
```typescript
totalBudget: number    // Monthly budget limit
totalSpent: number     // Already spent
month: string          // "YYYY-MM" format
```

**Calculation Logic**:
```tsx
const daysRemaining = Math.max(0, totalDays - currentDay)
const daysElapsed = Math.max(1, currentDay)

// Current daily rate (trend-based)
const dailyRate = totalSpent / daysElapsed

// Safe daily rate (to stay on budget)
const remainingBudget = totalBudget - totalSpent
const safeDailyRate = remaining > 0 ? remainingBudget / remaining : 0

// Projection
const projected = totalSpent + (dailyRate * remaining)
const percent = totalBudget > 0 ? (projected / totalBudget) * 100 : 0
```

**Status Determination**:
```tsx
if (percent > 100) statusResult = 'danger'
else if (percent > 90) statusResult = 'warning'
else statusResult = 'good'
```

---

## 5. StatusBadge (Status Indicator)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/status-badge.tsx`

**Purpose**: Visual status indicator for:
- Budget health (on_track/warning/exceeded)
- Tight 44x44px touch target compliance

**Status Determination**:
```typescript
type BudgetStatus = 'on_track' | 'warning' | 'exceeded'

export function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= 95) return 'exceeded'    // Red
  if (percentage >= 80) return 'warning'     // Yellow
  return 'on_track'                           // Green
}
```

**Component Variants**:
```tsx
// Full badge with label
<StatusBadge status={status} percentage={percentage} showLabel={true} />

// Icon-only (16px icon in 44px touch area via parent padding)
<StatusBadgeMini status={status} />
```

**Touch Area Pattern**:
```tsx
// In AllocationCard.tsx - parent provides padding for 44px target
{trackingItem && (
  <div className="flex-shrink-0 -my-2 py-2 -mx-1 px-1">
    <StatusBadge status={budgetStatus} percentage={spentPercent} />
  </div>
)}
```

---

## 6. BudgetDonutChart (Allocation Distribution)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-donut-chart.tsx`

**Purpose**: Pie chart showing:
- Top 5 allocation categories
- "Other" category for remainder
- Interactive hover effects
- Legend with percentages

**Chart Data Preparation**:
```tsx
const chartData = useMemo(() => {
  // Sort by amount descending
  const sorted = [...allocations].sort((a, b) => b.amount - a.amount)
  
  // Take top 5
  const top5 = sorted.slice(0, 5)
  const others = sorted.slice(5)
  
  // Build chart data with colors and percentages
  const data: ChartDataItem[] = top5.map((a, idx) => ({
    name: a.category,
    value: a.amount,
    percentage: totalAllocated > 0 ? (a.amount / totalAllocated) * 100 : 0,
    color: COLORS[idx % COLORS.length]
  }))
  
  // Add "Other" if needed
  if (othersTotal > 0) {
    data.push({
      name: t('budget.donutChart.other'),
      value: othersTotal,
      percentage: ...,
      color: COLORS[7] // Gray
    })
  }
  
  return data
}, [allocations, totalAllocated])
```

---

## 7. SpendingAlert (Alert System)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/spending-alert.tsx`

**Purpose**: Generates and displays:
- Exceeded budget alerts (red, max 2)
- Warning alerts (yellow, max 1-2)
- On-track alerts (green, if no issues)
- Dismissible with local state

**Alert Generation Logic**:
```tsx
const generateAlerts = (): Alert[] => {
  const alerts: Alert[] = []
  
  const exceeded = categories.filter(c => c.status === 'red')
  const warning = categories.filter(c => c.status === 'orange')
  
  // Exceeded alerts (max 2)
  exceeded.slice(0, 2).forEach(cat => {
    alerts.push({
      type: 'exceeded',
      category: cat.category,
      message: t('budget.alerts.exceededBy', {
        category: cat.category,
        amount: formatCurrency(Math.abs(cat.remaining))
      })
    })
  })
  
  // Warning alerts (max 1 if exceeded, max 2 otherwise)
  const maxWarnings = exceeded.length > 0 ? 1 : 2
  warning.slice(0, maxWarnings).forEach(cat => {
    alerts.push({
      type: 'warning',
      category: cat.category,
      message: t('budget.alerts.approaching', ...)
    })
  })
  
  // If all on track
  if (exceeded.length === 0 && warning.length === 0) {
    alerts.push({
      type: 'onTrack',
      message: t('budget.alerts.allOnTrack', ...)
    })
  }
  
  return alerts
}
```

---

## 8. TransactionSection (Category Transactions)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/transaction-section.tsx`

**Purpose**: Displays:
- Top 5 transactions for a category (sorted by JPY amount)
- Transaction date, description, amount
- Loading/error states
- "View All" button

**Data Fetching**:
```tsx
useEffect(() => {
  // Get all categories (parent + children)
  const searchCategories = [category, ...children]
  
  const data = await fetchTransactions({
    categories: searchCategories,
    start_date: startDate,
    end_date: endDate,
    type: 'expense'
  })
  
  // Convert to JPY for consistent sorting
  const rates = exchangeRates?.rates || {}
  const withJpyAmount = data
    .filter(tx => !tx.is_transfer)
    .map(tx => ({
      ...tx,
      amountJpy: convertToJpy(Math.abs(tx.amount), tx.currency || 'JPY', rates)
    }))
  
  // Sort by JPY amount (largest first) and take top 5
  const sorted = withJpyAmount.sort((a, b) => b.amountJpy - a.amountJpy)
  setTransactions(sorted.slice(0, 5).map(({ amountJpy, ...tx }) => tx))
}, [category, month])
```

**Currency Conversion Helper**:
```tsx
function convertToJpy(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'JPY') return amount
  const rate = rates[currency]
  if (!rate || rate === 0) return amount
  // rate_to_jpy is "units per JPY", so divide to convert to JPY
  return Math.round(amount / rate)
}
```

---

## 9. BudgetGenerateForm (Initial Budget Generation)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-generate-form.tsx`

**Purpose**: 
- Generate new budget from monthly income input
- Clone previous month budget option
- Currency-aware input formatting

**Key Props**:
```typescript
onGenerate: (income: number) => void   // Called with income in smallest unit
isLoading: boolean
error: boolean
suggestions?: BudgetSuggestions        // Clone option data
```

**Income Handling**:
```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  
  // Parse formatted number back to numeric value
  const numericValue = parseFormattedNumber(monthlyIncome)
  
  // Convert to cents/smallest unit for decimal currencies
  // JPY/VND are stored as-is, USD/EUR stored in cents
  const incomeAmount = Math.round(numericValue * Math.pow(10, decimalPlaces))
  
  if (incomeAmount > 0) {
    onGenerate(incomeAmount)
    setMonthlyIncome('')
  }
}
```

---

## 10. State Management Pattern (Budget.tsx Page)

**File**: `/home/godstorm91/project/smartmoney/frontend/src/pages/Budget.tsx`

**Query Keys Used**:
```typescript
['budget', 'month', selectedMonth]           // Current budget
['budget', 'previous-month', selectedMonth]  // Comparison
['budget', 'tracking', selectedMonth]        // Spending data
['budget', 'suggestions']                    // Clone suggestions
['budget']                                   // Generic invalidation
```

**Page-Level State**:
```tsx
const [selectedMonth, setSelectedMonth] = useState<string>(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

const [draftBudget, setDraftBudget] = useState<Budget | null>(null)
const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
const [undoStack, setUndoStack] = useState<{ action: string; data: Budget }[]>([])
const [showAddCategory, setShowAddCategory] = useState(false)
const [showConfirmDialog, setShowConfirmDialog] = useState(false)
```

**Mutation Pattern**:
```tsx
const generateMutation = useMutation({
  mutationFn: (income: number) => generateBudget({
    monthly_income: income,
    language: i18n.language
  }),
  onSuccess: (data) => {
    setDraftBudget(data)
    pushUndo('generate', data)
    showBudgetCreatedXP()
  },
})

// Usage
<button onClick={() => generateMutation.mutate(income)} />
```

---

## 11. Responsive Patterns

### Mobile-First Approach

**Grid Layouts**:
```tsx
// Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Component Visibility**:
```tsx
// Only show on mobile
<div className="lg:hidden">Mobile Content</div>

// Only show on desktop
<div className="hidden lg:flex">Desktop Content</div>

// Responsive flex direction
<div className="flex flex-col sm:flex-row">
```

### Breakpoints Used

- **Mobile**: Default (0px+)
- **sm** (640px): Small adjustments
- **md** (768px): Grid changes (2 columns)
- **lg** (1024px): Major layout changes (accordion → detail panel)

---

## 12. Absolute File Paths

```
/home/godstorm91/project/smartmoney/frontend/src/components/budget/allocation-card.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-detail-panel.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-allocation-list.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-projection-card.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/status-badge.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-donut-chart.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/spending-alert.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/transaction-section.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/budget-generate-form.tsx
/home/godstorm91/project/smartmoney/frontend/src/components/budget/projection-progress-bar.tsx
/home/godstorm91/project/smartmoney/frontend/src/pages/Budget.tsx
```

