# Budget UI/UX Visual Reference Guide

Quick visual patterns and code snippets for implementation.

---

## Status Badge Component

```tsx
interface StatusBadgeProps {
  spent: number
  allocated: number
}

export function StatusBadge({ spent, allocated }: StatusBadgeProps) {
  const percentage = (spent / allocated) * 100

  const getStatus = () => {
    if (percentage > 100) return { icon: '🚨', color: 'text-red-600', label: 'Over' }
    if (percentage > 95) return { icon: '⚠️', color: 'text-amber-600', label: 'Almost full' }
    if (percentage > 80) return { icon: '⚡', color: 'text-yellow-600', label: 'Caution' }
    return { icon: '✓', color: 'text-green-600', label: 'On track' }
  }

  const status = getStatus()

  return (
    <div className={`text-lg font-bold ${status.color}`}>
      {status.icon}
    </div>
  )
}
```

---

## Progress Bar with Color States

```tsx
interface ProgressBarProps {
  spent: number
  allocated: number
  daysRemaining: number
}

export function ProgressBar({ spent, allocated, daysRemaining }: ProgressBarProps) {
  const percentage = Math.min(100, (spent / allocated) * 100)

  const getBarColor = () => {
    if (spent > allocated) return 'bg-red-500'
    if (percentage > 95) return 'bg-amber-500'
    if (percentage > 80) return 'bg-yellow-500'
    if (percentage > 60) return 'bg-orange-400'
    return 'bg-green-500'
  }

  const dailyPace = daysRemaining > 0
    ? spent / ((31 - daysRemaining) || 1)
    : spent / 31

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Spending Progress</h3>
        <span className="text-sm text-gray-600">
          {formatCurrency(spent)} / {formatCurrency(allocated)}
        </span>
      </div>

      {/* Animated progress bar */}
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Progress details */}
      <div className="flex justify-between text-xs text-gray-600">
        <span>{Math.round(percentage)}% used</span>
        <span>~{formatCurrency(dailyPace)}/day</span>
        <span>{daysRemaining} days left</span>
      </div>
    </div>
  )
}
```

---

## Allocation Card with Status

```tsx
interface AllocationCardProps {
  category: string
  spent: number
  allocated: number
  tracking?: TrackingItem
}

export function EnhancedAllocationCard({
  category,
  spent,
  allocated,
  tracking
}: AllocationCardProps) {
  const percentage = (spent / allocated) * 100

  const getStatusIcon = () => {
    if (spent > allocated) return { icon: '🚨', color: 'red' }
    if (percentage > 95) return { icon: '⚠️', color: 'amber' }
    if (percentage > 80) return { icon: '⚡', color: 'yellow' }
    return { icon: '✓', color: 'green' }
  }

  const status = getStatusIcon()
  const remaining = allocated - spent

  return (
    <Card className="p-4">
      {/* Header with category name and status */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{category}</h4>
        <div className="text-xl">{status.icon}</div>
      </div>

      {/* Amount display */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Spent</span>
          <span className="font-semibold">{formatCurrency(spent)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Allocated</span>
          <span className="font-semibold">{formatCurrency(allocated)}</span>
        </div>
        <div className={cn(
          'flex justify-between text-sm font-medium',
          remaining >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          <span>Remaining</span>
          <span>{formatCurrency(Math.abs(remaining))}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full transition-all duration-500',
            spent > allocated ? 'bg-red-500' :
            percentage > 95 ? 'bg-amber-500' :
            percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
          )}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>

      {/* Percentage label */}
      <div className="text-xs text-gray-600 text-right">
        {Math.round(percentage)}%
      </div>
    </Card>
  )
}
```

---

## Donut Chart Component

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface BudgetDonutProps {
  allocated: number
  remaining: number
}

export function BudgetDonut({ allocated, remaining }: BudgetDonutProps) {
  const total = allocated + remaining
  const data = [
    { name: 'Allocated', value: allocated },
    { name: 'Remaining', value: remaining }
  ]

  const allocatedPercent = Math.round((allocated / total) * 100)

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
            label={false}
            startAngle={90}
            endAngle={-270}
          >
            <Cell fill="#4CAF50" /> {/* Allocated - Green */}
            <Cell fill="#E8F5E9" /> {/* Remaining - Light Gray */}
          </Pie>

          {/* Center text */}
          <text x="50%" y="45%" textAnchor="middle">
            <tspan
              fontSize="24"
              fontWeight="bold"
              fill="#333"
            >
              {allocatedPercent}%
            </tspan>
            <tspan
              x="50%"
              dy="20"
              fontSize="12"
              fill="#999"
            >
              Allocated
            </tspan>
          </text>
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>{formatCurrency(allocated)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-200 rounded" />
          <span>{formatCurrency(remaining)}</span>
        </div>
      </div>
    </div>
  )
}
```

---

## Health Status Banner

```tsx
interface HealthStatusProps {
  spent: number
  allocated: number
  health: 'good' | 'caution' | 'warning' | 'danger'
}

export function HealthStatusBanner({ spent, allocated, health }: HealthStatusProps) {
  const percentage = Math.round((spent / allocated) * 100)

  const getHealthConfig = () => {
    switch (health) {
      case 'good':
        return {
          icon: TrendingUp,
          label: 'On Track ✓',
          color: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-300',
          accentColor: 'bg-green-500'
        }
      case 'caution':
        return {
          icon: AlertTriangle,
          label: 'Caution',
          color: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-300',
          accentColor: 'bg-yellow-500'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          label: 'Warning',
          color: 'bg-amber-100',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-300',
          accentColor: 'bg-amber-500'
        }
      case 'danger':
        return {
          icon: AlertTriangle,
          label: 'Over Budget!',
          color: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-300',
          accentColor: 'bg-red-500'
        }
    }
  }

  const config = getHealthConfig()
  const Icon = config.icon

  return (
    <div className={`p-4 rounded-lg border-2 ${config.color} ${config.borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${config.accentColor}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className={`font-semibold ${config.textColor}`}>
              {config.label}
            </p>
            <p className={`text-sm ${config.textColor} opacity-75`}>
              {formatCurrency(spent)} of {formatCurrency(allocated)} spent
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${config.textColor}`}>
            {percentage}%
          </p>
          <p className={`text-xs ${config.textColor} opacity-75`}>
            budget used
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## Category Scroll with "View All"

```tsx
interface CategoryScrollProps {
  categories: CategoryData[]
  onViewAll: () => void
  maxVisible?: number
}

export function CategoryScroll({
  categories,
  onViewAll,
  maxVisible = 3
}: CategoryScrollProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 pb-2">
        {/* Show limited categories */}
        {categories.slice(0, maxVisible).map((cat) => (
          <div
            key={cat.category}
            className="flex-shrink-0 p-3 bg-gray-50 rounded-lg min-w-[140px]"
          >
            <p className="text-xs text-gray-500 truncate">{cat.category}</p>
            <p className="font-semibold text-gray-900 mt-1">
              {formatCurrency(cat.spent)}
            </p>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full',
                  cat.percentage > 100 ? 'bg-red-500' :
                  cat.percentage > 95 ? 'bg-amber-500' :
                  cat.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                )}
                style={{ width: `${Math.min(100, cat.percentage)}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {Math.round(cat.percentage)}%
            </p>
          </div>
        ))}

        {/* View All button */}
        {categories.length > maxVisible && (
          <button
            onClick={onViewAll}
            className="flex-shrink-0 p-3 bg-blue-50 rounded-lg min-w-[140px] flex items-center justify-center hover:bg-blue-100 transition-colors"
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">→</p>
              <p className="text-xs text-blue-600 font-semibold">
                View All
              </p>
              <p className="text-xs text-blue-500">
                ({categories.length})
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## Budget Confirmation Dialog

```tsx
interface BudgetConfirmationDialogProps {
  budget: Budget
  onConfirm: () => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function BudgetConfirmationDialog({
  budget,
  onConfirm,
  onCancel,
  isLoading = false
}: BudgetConfirmationDialogProps) {
  const totalAllocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0)

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Budget Changes?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Month</span>
              <span className="font-semibold">{budget.month}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monthly Income</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(budget.monthly_income)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Savings Target</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(budget.savings_target)}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="text-gray-600">Allocations</span>
              <span className="font-semibold">{budget.allocations.length} categories</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Allocated</span>
              <span className="font-semibold">{formatCurrency(totalAllocated)}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            This will update your budget for {budget.month}.
            You can edit it again anytime.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Confirm & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Daily Pace Calculator

```tsx
function calculateDailyPace(spent: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0
  return spent / daysElapsed
}

function calculateDaysRemaining(currentDay: number, month: number): number {
  const daysInMonth = new Date(
    new Date().getFullYear(),
    month + 1,
    0
  ).getDate()
  return Math.max(0, daysInMonth - currentDay)
}

// Usage
const currentDay = new Date().getDate()
const month = new Date().getMonth()
const daysRemaining = calculateDaysRemaining(currentDay, month)
const daysElapsed = currentDay - 1
const dailyPace = calculateDailyPace(spent, daysElapsed)

// Display
<span>
  At {formatCurrency(dailyPace)}/day, you'll
  {dailyPace * daysRemaining > allocated ? 'exceed' : 'stay within'}
  your budget
</span>
```

---

## Mobile vs Desktop Layout

### Mobile (<640px)
```tsx
export function BudgetPageMobile() {
  return (
    <div className="space-y-4">
      {/* Sticky header */}
      <StickyHeader />

      {/* Status banner - prominence */}
      <HealthStatusBanner />

      {/* Quick metrics - 3 cards */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard />
        <MetricCard />
        <MetricCard />
      </div>

      {/* Progress bar */}
      <ProgressBar />

      {/* Category scroll */}
      <CategoryScroll />

      {/* Allocations - accordion */}
      <AllocationAccordion />
    </div>
  )
}
```

### Tablet (640px-1023px)
```tsx
export function BudgetPageTablet() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <HealthStatusBanner />
      </div>

      <MetricCard />
      <MetricCard />

      <div className="col-span-2">
        <ProgressBar />
      </div>

      <div className="col-span-2">
        <CategoryScroll />
      </div>

      {/* Allocations list - full width */}
      <div className="col-span-2">
        <AllocationList />
      </div>
    </div>
  )
}
```

### Desktop (1024px+)
```tsx
export function BudgetPageDesktop() {
  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="col-span-3 space-y-4">
        <HealthStatusBanner />

        <div className="grid grid-cols-3 gap-4">
          <MetricCard />
          <MetricCard />
          <MetricCard />
        </div>

        <ProgressBar />
        <BudgetDonut />
        <AllocationList />
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        <DetailPanel />
      </div>
    </div>
  )
}
```

---

## ARIA Labels Template

```tsx
// Health Status Banner
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  aria-label={`Budget health: ${health.label}. ${percentage}% spent.`}
>
  {/* content */}
</div>

// Progress Bar
<div
  role="progressbar"
  aria-valuenow={Math.round(percentage)}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Spending ${Math.round(percentage)}% of allocated budget`}
>
  {/* content */}
</div>

// Category Card
<div
  role="region"
  aria-label={`${category} spending: ${spent} of ${allocated}`}
>
  {/* content */}
</div>

// Dynamic update notification
<div
  aria-live="polite"
  aria-atomic="false"
  className="sr-only"
>
  {/* Screen reader-only text for updates */}
  Budget updated: {category} now at {percentage}%
</div>
```

---

## Color State Reference

```tsx
const BUDGET_COLORS = {
  good: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    accent: 'bg-green-500',
    icon: TrendingUp
  },
  caution: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
    accent: 'bg-yellow-500',
    icon: AlertTriangle
  },
  warning: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    accent: 'bg-amber-500',
    icon: AlertTriangle
  },
  danger: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    accent: 'bg-red-500',
    icon: AlertTriangle
  }
}

// Usage
const config = BUDGET_COLORS[health]
```

---

## Testing Utilities

```tsx
// Test daily pace calculation
describe('Daily Pace Calculation', () => {
  it('should calculate correct daily pace', () => {
    expect(calculateDailyPace(100000, 10)).toBe(10000)
    expect(calculateDailyPace(50000, 0)).toBe(0)
  })
})

// Test status determination
describe('Status Badge', () => {
  it('should show green for <80%', () => {
    const { color } = getStatusIcon(50, 100)
    expect(color).toBe('green')
  })

  it('should show red for >100%', () => {
    const { color } = getStatusIcon(150, 100)
    expect(color).toBe('red')
  })
})

// Test progress bar animation
describe('Progress Bar', () => {
  it('should animate smoothly', () => {
    render(<ProgressBar spent={50000} allocated={100000} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveClass('transition-all duration-500')
  })
})
```

---

**Ready for Implementation** → Reference this guide while coding Phase 1 tasks
