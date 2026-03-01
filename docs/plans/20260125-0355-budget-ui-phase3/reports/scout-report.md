# Budget Components Scout Report - Phase 3 Planning

**Date:** 2026-01-25
**Scope:** frontend/src/components/budget/
**Purpose:** Understand current budget UI implementation for Phase 3 enhancement planning

---

## Executive Summary

The budget components architecture is well-organized with **15 reusable components** forming a modular system. Current implementation features a single-view layout with category cards, horizontal scrolling, and a side-panel detail view. Strong foundation exists for tab-based navigation expansion.

---

## 1. Component Inventory & Purposes

### Core Layout Components

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| **AllocationCard** | `allocation-card.tsx` | Desktop/tablet expandable category card with accordion | allocation, trackingItem, totalBudget, month, isExpanded, onToggleExpand, onOpenDetail |
| **BudgetDetailPanel** | `budget-detail-panel.tsx` | Side-panel (mobile/desktop) showing category details, transactions, comparison | category, month, trackingItem, isOpen, onClose |
| **TransactionSection** | `transaction-section.tsx` | Renders top 5 transactions for a category with date formatting | category, month, onViewAll |

### Summary & Overview Components

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| **BudgetSummaryCard** | `budget-summary-card.tsx` | Top-level budget overview: income, savings, carry-over, allocated amounts | budget, totalAllocated, isDraft, previousMonth, onRegenerateClick, onSaveClick |
| **BudgetDonutChart** | `budget-donut-chart.tsx` | Pie chart showing allocation distribution (top 5 + Other) | allocations, totalBudget, totalAllocated |
| **BudgetHealthIndicator** | `budget-health-indicator.tsx` | Circular progress ring showing budget health status (excellent/good/fair/poor) | totalBudget, totalAllocated, tracking |
| **BudgetProjectionCard** | `budget-projection-card.tsx` | Spending forecast: days remaining, current pace vs safe pace, projected total | totalBudget, totalSpent, month |

### Allocation Management Components

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| **BudgetAllocationList** | `budget-allocation-list.tsx` | Main allocation list with sorting, grouping (needs/wants/savings), quick adjustments | budgetId, allocations, totalBudget, tracking, isDraft, onAddCategory, onAllocationChange |
| **AddCategoryModal** | `add-category-modal.tsx` | Modal for adding new allocation categories to draft budget | (needs read to determine full API) |

### Form & Generation Components

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| **BudgetGenerateForm** | `budget-generate-form.tsx` | Initial form to generate new budget from monthly income; supports cloning previous month | onGenerate, isLoading, error, suggestions |
| **BudgetFeedbackForm** | `budget-feedback-form.tsx` | Feedback form for regenerating budget with user input | (needs read to determine full API) |
| **BudgetConfirmDialog** | `budget-confirm-dialog.tsx` | Confirmation dialog for saving draft budget | (needs read to determine full API) |

### Utility & Status Components

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| **StatusBadge** | `status-badge.tsx` | Status indicator (on_track/warning/exceeded) with icon; also mini variant | status, percentage, showLabel, className |
| **SpendingAlert** | `spending-alert.tsx` | Alert system showing exceeded/warning/onTrack alerts with dismissal | categories, daysRemaining, onViewCategory |
| **ProjectionProgressBar** | `projection-progress-bar.tsx` | Dual-segment progress bar: spent (solid) + projected (lighter) | spent, projected, budget |

---

## 2. Current Layout Structure

### Page Architecture (Budget.tsx)

**Sticky Header Section:**
- Month navigation (prev/next buttons)
- Page title + subtitle
- Action buttons (undo, export)

**Main Content Flow (Single View):**

1. **Empty State**: BudgetGenerateForm (if no budget exists)
2. **Health Status Banner**: Color-coded health summary with % used
3. **BudgetProjectionCard**: Spending forecast card
4. **BudgetDonutChart**: Allocation distribution (5 categories + Other)
5. **Quick Stats Row** (3-column grid):
   - Income card
   - Savings target card
   - Remaining budget card
6. **Spending Progress**: Overall progress bar + days remaining
7. **Category Breakdown**: Horizontal scroll view (10 categories max, emoji status icons)
8. **Full Allocation List**: AllocationCard grid (1 col mobile, 2 col desktop)
9. **Side Panel**: BudgetDetailPanel (right slide-in, mobile backdrop)

**Mobile Responsive Flow:**
- Stack everything vertically
- AllocationCard uses accordion (Chevron expand/collapse)
- Transactions hidden until card expanded (accordion content)
- Detail panel slides over full screen on mobile

**Desktop (lg) Responsive Flow:**
- AllocationCard shows info button (not accordion)
- Transactions shown in side panel on button click
- Wider layout (max-w-2xl container)

---

## 3. State Management Patterns

### React Query (TanStack Query) Usage

**Query Keys:**
```
['budget', 'month', selectedMonth]           // Current month budget
['budget', 'previous-month', selectedMonth]  // Previous month for comparison
['budget', 'tracking', selectedMonth]        // Spending tracking data
['budget', 'suggestions']                    // Clone suggestions
['budget']                                   // Generic invalidation key
```

**Key Hooks:**
- `useQuery` for fetch operations (budget data, tracking, suggestions)
- `useMutation` for mutations (generate, regenerate, update allocation, delete allocation)
- `useQueryClient` for manual invalidation/refetching

### Local State (useState)

**Page-Level State (Budget.tsx):**
- `selectedMonth`: Current displayed month (format: "YYYY-MM")
- `draftBudget`: In-memory draft before saving
- `expandedCategory`: Mobile accordion state
- `selectedCategory`: Desktop detail panel state
- `showAddCategory`: Add category modal visibility
- `showConfirmDialog`: Save confirmation dialog
- `undoStack`: Undo history (max 10 actions)
- `showFeedbackForm`: Regenerate feedback form visibility

**Component-Level State:**
- AllocationCard: `isExpanded` (passed as prop)
- BudgetAllocationList: `sortBy`, `groupBy`, `sortDirection`
- BudgetDetailPanel: `transactions`, `isLoading`, `error`, `previousMonthSpent`
- TransactionSection: `transactions`, `isLoading`, `error`
- StatusBadge: None (presentation-only)
- SpendingAlert: `dismissedAlerts` (Set of dismissed alert keys)

### Context Usage

- **SettingsContext**: `currency` setting
- **PrivacyContext**: `isPrivacyMode` flag
- **ExchangeRates Hook**: `exchangeRates` data for currency conversion

---

## 4. Existing Tab/Navigation Components

**Current Implementation:**
- **NO dedicated tab component** in budget directory
- **Horizontal Scroll Card**: Budget.tsx line 493 shows category scroll (emoji-based status)
- **Sorting/Grouping Dropdowns**: BudgetAllocationList lines 207-236
  - Group options: "None" | "Needs-Wants"
  - Sort options: "Priority" | "Amount"
- **Accordion Pattern**: AllocationCard (mobile only)
- **Detail Slide Panel**: BudgetDetailPanel (right-aligned, toggleable)

**UI Library Components Used:**
- Card, Button, Input (from @/components/ui/)
- Lucide icons for navigation (ChevronUp, ChevronDown, etc.)

---

## 5. Mobile vs Desktop Responsive Patterns

### Breakpoint Usage

**Mobile-First Classes:**
```
Utility: hidden lg:flex / hidden sm:flex / flex sm:flex-row (mobile default)
Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 (e.g., BudgetSummaryCard)
Container: max-w-2xl mx-auto (consistent width limit)
Padding: px-4 py-4 (consistent spacing)
```

### Component Behavior by Breakpoint

| Component | Mobile | Tablet | Desktop (lg) |
|-----------|--------|--------|------------|
| **AllocationCard** | Accordion (expand/collapse), in-card transactions | Expanded card showing info button | Info button opens side panel |
| **BudgetDetailPanel** | Full screen slide-in from right | 384px width (sm:w-96) | 384px width, no backdrop |
| **Header** | Sticky, responsive font (text-lg sm:text-2xl) | Sticky | Sticky |
| **Stats Grid** | 3 columns (grid-cols-3) | 3 columns | 4 columns with optional carry-over |
| **Category Scroll** | 10 categories max | 10 categories max | 10 categories max |
| **Allocation List** | 1 column | 2 columns (md:grid-cols-2) | 2 columns |

### Responsive Utilities Applied

```tsx
// Example: AllocationCard.tsx
<div className="lg:hidden transition-all duration-300 ease-out">
  {/* Mobile accordion content */}
</div>
<div className="hidden lg:flex px-4 pb-3">
  {/* Desktop info button */}
</div>

// Example: BudgetDetailPanel.tsx
className="w-full sm:w-96"  // Mobile full width, tablet+ 384px
className="fixed right-0 top-0 ... flex flex-col"
className="lg:hidden"  // Backdrop only on mobile
```

### Touch Targets

**44x44px Touch Area Strategy:**
- StatusBadge wrapper uses parent padding: `-my-2 py-2 -mx-1 px-1`
- Icon sizes: w-4 h-4 (16px) padded to 44px area
- Button padding: p-1.5, p-2, etc. for 44px min target

---

## 6. Data Flow & Component Relationships

### Budget.tsx → Child Components Flow

```
BudgetPage (main orchestrator)
├─ State: selectedMonth, draftBudget, expandedCategory, selectedCategory
├─ Queries: savedBudget, previousMonth, tracking, suggestions
├─ Mutations: generate, regenerate
│
├─ BudgetGenerateForm
│  └─ onGenerate → generateMutation.mutate
│
├─ BudgetProjectionCard
│  └─ Props: totalBudget, totalSpent, selectedMonth
│
├─ BudgetDonutChart
│  └─ Props: allocations, totalBudget, totalAllocated
│
├─ Quick Stats Cards (inline)
│  └─ Props: income, savings_target, remaining
│
├─ SpendingAlert
│  └─ Props: categories, daysRemaining
│  └─ onViewCategory → setSelectedCategory → BudgetDetailPanel opens
│
├─ AllocationCard (grid map)
│  ├─ Props: allocation, tracking, isDraft
│  ├─ onToggleExpand → setExpandedCategory (mobile)
│  ├─ onOpenDetail → setSelectedCategory (desktop)
│  └─ Child: TransactionSection (mobile expanded)
│
├─ BudgetDetailPanel (side panel)
│  ├─ Props: category, month, trackingItem, isOpen
│  ├─ Queries: current month transactions, previous month total
│  └─ onClose → setSelectedCategory(null)
│
├─ AddCategoryModal
│  └─ State: showAddCategory
│
└─ BudgetConfirmDialog
   └─ State: showConfirmDialog
```

### Mutation & Invalidation Pattern

```tsx
// After save mutation completes:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['budget'] })
}

// This cascades invalidation to all budget-related queries
// Component re-renders with fresh data from server
```

---

## 7. Currency & Privacy Handling

### Formatting Pipeline

**All monetary displays use:**
```tsx
formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, 
  showDecimals, isPrivacyMode)
```

**Multi-Currency Scenario:**
- Transactions converted to JPY for consistent sorting (BudgetDetailPanel, TransactionSection)
- Helper: `convertToJpy(amount, currency, rates)`
- Rate field: `rates[currency]` = units per JPY

---

## 8. Key Architecture Observations

### Strengths
1. **Modular Component Design**: Clear separation of concerns
2. **Reusable Patterns**: StatusBadge, progress bars, detail panels
3. **Responsive First**: Mobile-optimized with progressive enhancement
4. **State Colocalization**: Query state at page level, UI state at component level
5. **Accessibility**: ARIA labels, role attributes, semantic HTML
6. **Dark Mode**: Complete dark mode support throughout

### Considerations for Phase 3
1. **No Tab Component Infrastructure**: Would need to add either:
   - New tab wrapper component
   - Tab state management at page level
   - Conditional rendering of tab content

2. **Single View Layout**: Current architecture assumes linear scrolling; tabs would require:
   - Separate component trees for each tab
   - State management for active tab
   - Potential code splitting for lazy tab loading

3. **Expandable Accordion Pattern**: Could integrate with tab navigation for consistency

4. **Side Panel Usage**: Currently for detail view; tabs might conflict with panel width

---

## 9. File Structure Summary

```
frontend/src/components/budget/
├── allocation-card.tsx                  (Desktop expandable card)
├── allocation-card-old.tsx              (Legacy - in BudgetAllocationList)
├── add-category-modal.tsx               (Add category modal)
├── budget-allocation-list.tsx           (Main allocation list container)
├── budget-confirm-dialog.tsx            (Save confirmation)
├── budget-detail-panel.tsx              (Side panel for category details)
├── budget-donut-chart.tsx               (Allocation distribution chart)
├── budget-feedback-form.tsx             (Regenerate feedback form)
├── budget-generate-form.tsx             (Initial budget generation)
├── budget-health-indicator.tsx          (Health status ring)
├── budget-projection-card.tsx           (Spending forecast)
├── budget-projection-card.test.ts       (Test file)
├── budget-projection.test.ts            (Test file)
├── budget-summary-card.tsx              (Budget overview card)
├── projection-progress-bar.tsx          (Dual-segment progress)
├── spending-alert.tsx                   (Alert system)
├── spending-alert.test.tsx              (Test file)
├── status-badge.tsx                     (Status indicator + mini variant)
├── status-badge.test.ts                 (Test file)
├── transaction-section.tsx              (Transaction list for category)
└── (Test files: .test.ts, .test.tsx)
```

---

## 10. Current Responsive Breakpoints Used

- **sm (640px)**: Some text sizing, flex direction changes
- **md (768px)**: Grid layout changes (2 columns)
- **lg (1024px)**: Major layout changes (info button vs accordion, full width vs constrained)

---

## Technology Stack

- **Framework**: React 18+ (hooks)
- **Router**: TanStack React Router
- **State**: TanStack React Query, React Context
- **Styling**: Tailwind CSS with dark mode
- **Icons**: Lucide React
- **i18n**: react-i18next
- **Charts**: Recharts (donut chart)
- **Form State**: Local useState

---

## Unresolved Questions / Next Steps

1. **Tab Implementation Strategy**:
   - Should tabs replace current single-view scroll, or exist alongside?
   - Tab content: Different views? Filtering? Time periods?

2. **State Management for Tabs**:
   - Should tab state persist in URL? (query param or route)
   - Should tab switching reset component internal state?

3. **Detail Panel + Tabs**:
   - How to handle side panel with tab-based layout?
   - Should tabs be full-width or accommodate panel?

4. **Mobile Tab Experience**:
   - Should tabs become bottom navigation on mobile?
   - Or remain top tabs with improved scrolling?

5. **Backward Compatibility**:
   - Existing URLs with sorting/grouping state?
   - Should new tab structure preserve current filtering?

