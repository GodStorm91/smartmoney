# Category Management Implementation Guide
## Quick Reference for SmartMoney Developers

**Purpose:** Quick checklist + code patterns for implementing category UX improvements
**For Full Details:** See `CATEGORY_MANAGEMENT_UX_RESEARCH.md`
**Status:** Ready for implementation

---

## Critical Design Decisions (Made)

| Decision | Recommendation | Reasoning |
|----------|---|---|
| **Parent-Child Hierarchy Depth** | Max 2 levels | Deeper nesting causes UX problems (horizontal scroll, lost context) |
| **Parent Budget Aggregation** | Include all children transactions | Matches user expectations: "Food budget" = all food-related spending |
| **Category Picker Consistency** | Use HierarchicalCategoryPicker everywhere | Reduces cognitive load, easier maintenance |
| **Desktop Picker Adaptation** | Dropdown mode (vs modal on mobile) | Supports inline selection; modal overkill on large screens |
| **Status Indicators** | Badge in top-right corner | Quick visual scan (on-track/caution/over-budget) |
| **Category Selection UI** | Keep hierarchical grid (mobile); add tree expansion (desktop) | Balances touch targets with information density |

---

## Priority 1: Status Badges (1-2 weeks)

### What to Build
Visual badge showing category budget status at a glance.

### Files to Modify
1. **Create:** `components/budget/status-badge.tsx` (NEW, ~50 lines)
2. **Modify:** `components/budget/budget-allocation-card.tsx` (~10 lines)

### Code Pattern

**1. Create StatusBadge Component**
```tsx
// components/budget/status-badge.tsx
import { cn } from '@/utils/cn'

export type BudgetStatus = 'on-track' | 'caution' | 'warning' | 'over-budget'

interface StatusBadgeProps {
  status: BudgetStatus
  percent: number
  spent?: number
  budgeted?: number
}

export function StatusBadge({ status, percent, spent, budgeted }: StatusBadgeProps) {
  const config: Record<BudgetStatus, { icon: string; color: string; text: string }> = {
    'on-track': { icon: '✓', color: 'bg-green-100 text-green-700', text: `${Math.round(percent)}%` },
    'caution': { icon: '⚠', color: 'bg-yellow-100 text-yellow-700', text: `${Math.round(percent)}%` },
    'warning': { icon: '⚠', color: 'bg-orange-100 text-orange-700', text: `${Math.round(percent)}%` },
    'over-budget': { icon: '🚨', color: 'bg-red-100 text-red-700', text: 'Over' }
  }

  const { icon, color, text } = config[status]

  return (
    <div className={cn('px-2 py-1 rounded text-xs font-medium flex items-center gap-1', color)}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

// Helper function: determine status from spending data
export function getStatus(spent: number, budgeted: number): BudgetStatus {
  if (spent > budgeted) return 'over-budget'
  const percent = (spent / budgeted) * 100
  if (percent >= 95) return 'warning'
  if (percent >= 80) return 'caution'
  return 'on-track'
}
```

**2. Update AllocationCard to Use StatusBadge**
```tsx
// In budget-allocation-card.tsx, add to header:

import { StatusBadge, getStatus } from '@/components/budget/status-badge'

// Inside AllocationCard component, update header JSX:
<div className="flex justify-between items-start mb-2">
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <h4 className="font-semibold dark:text-gray-100 truncate">
      {allocation.category}
    </h4>
    {trackingItem && isOverBudget && (
      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
    )}
  </div>

  <div className="flex items-center gap-2 flex-shrink-0">
    {/* NEW: Status badge */}
    {trackingItem && (
      <StatusBadge
        status={getStatus(trackingItem.spent, trackingItem.budgeted)}
        percent={(trackingItem.spent / trackingItem.budgeted) * 100}
      />
    )}
    {/* ... rest of existing buttons ... */}
  </div>
</div>
```

### Testing Checklist
- [ ] Status shows correct color for <80% spent (green)
- [ ] Status shows correct color for 80-95% spent (yellow)
- [ ] Status shows correct color for 95-100% spent (orange)
- [ ] Status shows correct color for >100% spent (red)
- [ ] Badge doesn't break card layout on mobile
- [ ] Badge has sufficient color contrast (verify in dark mode)

---

## Priority 2: Parent Category Context (1 week)

### What to Build
Show which parent group each allocation belongs to.

### Files to Modify
1. **Modify:** `components/budget/budget-allocation-card.tsx` (~15 lines)
2. **Verify:** `types/budget.ts` (check BudgetAllocation has parent info)

### Code Pattern

**1. Add Parent Info to AllocationCard Display**
```tsx
// In budget-allocation-card.tsx

interface AllocationCardProps {
  // ... existing props ...
  parentName?: string      // NEW
  parentIcon?: string      // NEW
}

// Inside component JSX, after category name:
{parentName && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    {parentIcon && <span className="mr-1">{parentIcon}</span>}
    {parentName}
  </p>
)}
```

**2. Pass Parent Data from CategoriesTab**
```tsx
// In components/budget/tabs/categories-tab.tsx

{displayBudget.allocations.map(allocation => (
  <AllocationCard
    key={allocation.category}
    allocation={allocation}
    parentName={allocation.parent_name}      // NEW
    parentIcon={allocation.parent_icon}      // NEW
    // ... existing props ...
  />
))}
```

**3. Verify Type Definition**
```tsx
// In types/budget.ts, BudgetAllocation should include:

export interface BudgetAllocation {
  category: string
  amount: number
  parent_name?: string           // <- ADD IF MISSING
  parent_icon?: string           // <- ADD IF MISSING
  reasoning?: string
  // ... existing fields ...
}
```

### Data Flow Check
- ✅ Budget API returns parent info in allocation objects
- ✅ BudgetAllocation type includes parent fields
- ✅ CategoriesTab passes parent data to AllocationCard
- ✅ AllocationCard displays parent context

---

## Priority 3: Days Remaining + Pacing (1 week)

### What to Build
Show how many days left in month + daily spending pace.

### Files to Modify
1. **Modify:** `components/budget/budget-allocation-card.tsx` (~20 lines)

### Code Pattern

```tsx
// In budget-allocation-card.tsx

interface AllocationCardProps {
  // ... existing props ...
  currentMonth?: string  // NEW: "2026-01" format for date calculations
}

// Helper: calculate days remaining in month
function getDaysRemaining(month: string): number {
  const [year, monthNum] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNum, 0).getDate()  // Last day of month
  const today = new Date().getDate()
  return Math.max(0, lastDay - today)
}

// Helper: calculate daily pace
function getDailyPace(spent: number, daysElapsed: number): number {
  if (daysElapsed === 0) return 0
  return spent / daysElapsed
}

// Inside component JSX, after progress bars:
{trackingItem && (
  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
      <span>
        {getDaysRemaining(currentMonth)} days remaining
      </span>
      <span>
        {formatCurrency(getDailyPace(spent, getDaysElapsed(currentMonth)))}/day
      </span>
    </div>
  </div>
)}

// Helper: get days elapsed in current month
function getDaysElapsed(month: string): number {
  const today = new Date().getDate()
  return today
}
```

### Considerations
- Only show if within current month (not historical)
- Calculations assume spending is linear (add caveat if needed)
- Could enhance to show "on track to overspend by ¥X" based on daily pace

---

## Priority 4: Desktop Category Picker Adaptation (2 weeks)

### What to Build
Dropdown-based category picker for desktop; keep modal picker for mobile.

### Files to Modify
1. **Create:** `components/budget/category-picker-dropdown.tsx` (NEW, ~150 lines)
2. **Modify:** `components/transactions/HierarchicalCategoryPicker.tsx` (responsive layout)
3. **Modify:** `components/budget/add-category-modal.tsx` (use conditional picker)

### Code Pattern

**1. Responsive Layout Update in HierarchicalCategoryPicker**
```tsx
// In HierarchicalCategoryPicker.tsx

// Change grid from fixed 3 columns to responsive:
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
  {/* categories ... */}
</div>

// Add visual indicator for parents (shows this can be expanded):
{categories.map((parent) => (
  <button
    key={parent.id}
    type="button"
    onClick={() => handleParentClick(parent)}
    className="relative group"
  >
    {/* existing content */}

    {/* NEW: chevron indicator */}
    <div className="absolute top-2 right-2 text-gray-400 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
      <ChevronRight className="w-4 h-4" />
    </div>
  </button>
))}
```

**2. Desktop Dropdown Component (Sketch)**
```tsx
// components/budget/category-picker-dropdown.tsx
// Implementation pattern (not complete - adapt to project structure)

import { useState, useRef } from 'react'
import { ChevronRight } from 'lucide-react'

interface CategoryPickerDropdownProps {
  selected: string
  onSelect: (categoryName: string, parentName: string) => void
  isIncome?: boolean
}

export function CategoryPickerDropdown({
  selected,
  onSelect,
  isIncome = false
}: CategoryPickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedParents, setExpandedParents] = useState<number[]>([])
  const ref = useRef<HTMLDivElement>(null)

  // Toggle parent expansion
  const toggleParent = (parentId: number) => {
    setExpandedParents(prev =>
      prev.includes(parentId)
        ? prev.filter(id => id !== parentId)
        : [...prev, parentId]
    )
  }

  // Find selected category's parent for display
  const findParent = (childName: string) => {
    // ... helper logic ...
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded text-left"
      >
        {selected || 'Select category...'}
      </button>

      {isOpen && (
        <div className="absolute z-10 w-80 mt-1 bg-white border border-gray-300 rounded shadow-lg">
          {/* Tree view: parents with expandable children */}
          {categories.map(parent => (
            <div key={parent.id}>
              <button
                onClick={() => toggleParent(parent.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex justify-between items-center"
              >
                {parent.name}
                <ChevronRight
                  className={cn(
                    'w-4 h-4 transition-transform',
                    expandedParents.includes(parent.id) && 'rotate-90'
                  )}
                />
              </button>

              {expandedParents.includes(parent.id) && (
                <div className="pl-4 bg-gray-50">
                  {parent.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => {
                        onSelect(child.name, parent.name)
                        setIsOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**3. Conditional Picker Based on Device**
```tsx
// In components used for category selection (e.g., add-category-modal.tsx)

import { useMediaQuery } from '@/hooks/useMediaQuery'  // or use Tailwind's md breakpoint
import { HierarchicalCategoryPicker } from './HierarchicalCategoryPicker'
import { CategoryPickerDropdown } from './category-picker-dropdown'

export function CategorySelectionUI({ ... }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return isDesktop ? (
    <CategoryPickerDropdown {...props} />
  ) : (
    <HierarchicalCategoryPicker {...props} />
  )
}
```

### Testing Checklist
- [ ] Mobile (<768px) shows modal grid picker
- [ ] Tablet (768-1023px) shows modal grid picker
- [ ] Desktop (≥1024px) shows dropdown picker
- [ ] Desktop dropdown: click parent expands children
- [ ] Desktop dropdown: click child selects category
- [ ] Desktop dropdown: click outside closes dropdown
- [ ] Keyboard navigation works (Tab, Enter, Esc)

---

## Priority 5: Breadcrumb Navigation (2 weeks)

### What to Build
Show navigation path: Budget > Category > [Parent] > [Child]

### Files to Modify
1. **Create:** `components/common/breadcrumb.tsx` (NEW, ~80 lines)
2. **Modify:** `components/budget/tabs/categories-tab.tsx` (~10 lines)
3. **Modify:** `components/budget/tabs/transactions-tab.tsx` (~15 lines)

### Code Pattern

**1. Reusable Breadcrumb Component**
```tsx
// components/common/breadcrumb.tsx

interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: string
}

export function Breadcrumb({ items, separator = '/' }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className="text-sm text-gray-600 dark:text-gray-400">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && <span className="text-gray-400">{separator}</span>}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="hover:text-gray-900 dark:hover:text-gray-200 underline"
              >
                {item.label}
              </button>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
```

**2. Use in Categories Tab (Showing Selected Category Details)**
```tsx
// In categories-tab.tsx (when showing category detail view)

{selectedCategory && (
  <>
    <Breadcrumb
      items={[
        { label: 'Budget', onClick: () => setSelectedCategory(null) },
        { label: selectedMonth },
        { label: selectedCategory.parent_name || selectedCategory.name }
      ]}
    />

    {/* Category detail content */}
  </>
)}
```

**3. Use in Transactions Tab (Category Filter)**
```tsx
// In transactions-tab.tsx (showing active category filter)

{selectedCategory && (
  <Breadcrumb
    items={[
      { label: 'Filters' },
      { label: 'Category' },
      {
        label: selectedCategory.name,
        onClick: () => setSelectedCategory(null)
      }
    ]}
  />
)}
```

### Testing Checklist
- [ ] Breadcrumb appears when category selected
- [ ] Each breadcrumb level is clickable and navigates correctly
- [ ] Breadcrumb styling works in dark mode
- [ ] Mobile: breadcrumb doesn't overflow (wrap or truncate gracefully)
- [ ] Keyboard: Tab reaches breadcrumb items
- [ ] Screen reader: Reads breadcrumb structure correctly

---

## Implementation Order (Recommended)

```
Week 1:
├─ Status Badges (Priority 1)           [~4 days]
└─ Parent Category Context (Priority 2) [~2 days]

Week 2:
├─ Days Remaining + Pacing (Priority 3) [~3 days]
└─ Setup for Desktop Picker (Priority 4 prep) [~2 days]

Week 3:
├─ Desktop Category Picker Dropdown (Priority 4) [~5 days]
└─ Testing & Polish

Week 4:
├─ Breadcrumb Navigation (Priority 5) [~4 days]
└─ Accessibility Audit + Testing [~3 days]
```

---

## Data Flow Verification

Before implementing, confirm these data flows:

### 1. Budget Allocation Data
```
API Response → BudgetAllocation Type → AllocationCard Props → UI Display
```

**Must include:**
- ✅ category (name)
- ✅ amount (allocated)
- ✅ parent_name (for context display)
- ✅ parent_icon (optional, for visual consistency)

**Verify in:** `types/budget.ts` and backend endpoint

### 2. Budget Tracking Data
```
API Response → BudgetTrackingItem Type → AllocationCard Props → Status Badge
```

**Must include:**
- ✅ spent (actual spending)
- ✅ budgeted (allocated amount)
- ✅ remaining (calculated: budgeted - spent)

**Verify in:** `types/budget.ts` and backend endpoint

### 3. Current Month Prop
```
BudgetPage State → CategoriesTab Props → AllocationCard Props → Days Remaining Calc
```

**Must pass:** selectedMonth string in "YYYY-MM" format

---

## Accessibility Compliance Checklist

As you implement each feature:

### Status Badge
- [ ] Has aria-label describing status (e.g., "On track, 82 percent")
- [ ] Color contrast ≥4.5:1 in light and dark modes
- [ ] Icon is decorative (aria-hidden) or has text alternative

### Days Remaining / Pacing
- [ ] Labels clearly describe what each number means
- [ ] Percentage calculations use aria-label (not just raw percent)
- [ ] Not solely dependent on color for meaning (use text labels too)

### Breadcrumb Navigation
- [ ] Semantic HTML: `<nav>`, `<ol>`, `<li>`
- [ ] Each clickable item is a proper button or link
- [ ] Focus indicator clearly visible
- [ ] Keyboard: Tab navigation works; Enter/Space activates links

### Category Picker
- [ ] Keyboard navigation: Tab through parents → Enter to expand → Tab through children
- [ ] Escape key closes picker/dialog
- [ ] Focus trapped in modal (mobile) vs focus returns to button (desktop)
- [ ] aria-expanded on expandable items
- [ ] aria-selected on selected category

### Touch Targets
- [ ] All interactive elements ≥44x44px on mobile (<768px)
- [ ] Status badge doesn't reduce touch target size of underlying card
- [ ] Breadcrumb links ≥44x44px on mobile

---

## Color Reference (Verify in Tailwind Config)

Used in Status Badge and existing SmartMoney components:

```
Green (on-track):       bg-green-100 text-green-700 (light), dark:bg-green-900 text-green-400 (dark)
Yellow (caution):       bg-yellow-100 text-yellow-700 (light), dark:bg-yellow-900 text-yellow-400 (dark)
Orange (warning):       bg-orange-100 text-orange-700 (light), dark:bg-orange-900 text-orange-400 (dark)
Red (over-budget):      bg-red-100 text-red-700 (light), dark:bg-red-900 text-red-400 (dark)
```

Verify these colors meet 4.5:1 contrast ratio for text.

---

## Files Reference

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `components/budget/status-badge.tsx` | New status badge component | ~50 | CREATE |
| `components/budget/budget-allocation-card.tsx` | Add badge + parent + pacing | +30 | MODIFY |
| `components/budget/category-picker-dropdown.tsx` | Desktop category picker | ~150 | CREATE |
| `components/common/breadcrumb.tsx` | Reusable breadcrumb | ~80 | CREATE |
| `components/transactions/HierarchicalCategoryPicker.tsx` | Make responsive + indicators | +20 | MODIFY |
| `types/budget.ts` | Add parent_name, parent_icon fields | +5 | VERIFY |

---

## Related Documentation

- **Full Research:** `docs/CATEGORY_MANAGEMENT_UX_RESEARCH.md`
- **Budget UX Research:** `docs/budget-ui-ux-research.md`
- **Code Standards:** `docs/code-standards.md`
- **Design Guidelines:** `docs/design-guidelines.md`

---

**Next Step:** Pick one Priority 1 task and begin implementation. Refer to `CATEGORY_MANAGEMENT_UX_RESEARCH.md` for detailed rationale behind each recommendation.
