# Budget UI Phase 3 - Follow-up Implementation Plan

**Date:** 2026-01-25
**Status:** Ready for Implementation
**Scope:** Remaining tasks from Phase 3 + Polish
**Estimated Duration:** 3-4 days (1 developer)
**Total Story Points:** 9

---

## Context

Phase 3 core features deployed (v20260125.1):
- Desktop tabbed interface (4 tabs)
- Split-view category management
- Predictive overspending warnings (ML-lite)
- Responsive design

**Remaining:** Backend API for historical data, keyboard navigation, testing.

---

## Remaining Tasks

### Task 3.10: Backend API for Historical Data
**File:** `backend/app/routes/budget.py` (MODIFY)
**Story Points:** 3
**Priority:** HIGH

New endpoint for daily spending history needed for accurate predictions.

#### Endpoint Specification

```python
@router.get("/budget/history/{category}")
async def get_category_spending_history(
    category: str,
    months: int = Query(default=3, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> CategoryHistoryResponse:
    """
    Get daily spending history for a category.
    Used for ML-lite prediction calculations.

    Returns:
    - Daily spending amounts for the period
    - Monthly totals for comparison
    - Average daily spend per month
    """
```

#### Response Schema

```python
class DailySpending(BaseModel):
    date: str  # YYYY-MM-DD
    amount: float
    transaction_count: int

class MonthlyTotal(BaseModel):
    month: str  # YYYY-MM
    total: float
    avg_daily: float
    transaction_count: int

class CategoryHistoryResponse(BaseModel):
    category: str
    daily_spending: list[DailySpending]
    monthly_totals: list[MonthlyTotal]
    overall_avg_daily: float
    std_deviation: float  # For anomaly detection
```

#### SQL Query

```sql
-- Daily spending for category (last N months)
SELECT
    DATE(date) as spend_date,
    SUM(ABS(amount)) as daily_total,
    COUNT(*) as tx_count
FROM transactions
WHERE user_id = :user_id
  AND category = :category
  AND type = 'expense'
  AND is_transfer = false
  AND date >= :start_date
GROUP BY DATE(date)
ORDER BY spend_date DESC;

-- Monthly totals
SELECT
    TO_CHAR(date, 'YYYY-MM') as month,
    SUM(ABS(amount)) as total,
    COUNT(*) as tx_count
FROM transactions
WHERE user_id = :user_id
  AND category = :category
  AND type = 'expense'
  AND is_transfer = false
  AND date >= :start_date
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month DESC;
```

#### Frontend Integration

```typescript
// frontend/src/services/budget-service.ts
export async function getCategoryHistory(
  category: string,
  months: number = 3
): Promise<CategoryHistory> {
  const res = await api.get(`/budget/history/${encodeURIComponent(category)}`, {
    params: { months }
  })
  return res.data
}

// Update spending-prediction.ts to use historical data
function predictWithHistory(
  category: string,
  currentTracking: BudgetTrackingItem,
  history: CategoryHistory
): SpendingPrediction {
  // Use historical std deviation for anomaly detection
  const threshold = history.overall_avg_daily + (2 * history.std_deviation)
  // ...
}
```

#### Acceptance Criteria
- [ ] Endpoint returns daily spending for last N months
- [ ] Monthly totals include average daily calculation
- [ ] Standard deviation calculated for anomaly threshold
- [ ] Multi-currency transactions converted to JPY
- [ ] Response cached for 5 minutes (stale-while-revalidate)

---

### Task 3.13: Keyboard Navigation Enhancement
**Files:** Multiple components
**Story Points:** 2
**Priority:** MEDIUM

#### Required Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `ArrowUp/Down` | Category list | Navigate items |
| `Enter/Space` | Category list | Select focused item |
| `Escape` | Detail panel (overlay) | Close panel |
| `Home/End` | Category list | Jump to first/last |

#### Implementation

```tsx
// category-list-panel.tsx
function CategoryListPanel({ ... }) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelectCategory(items[focusedIndex].category)
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(items.length - 1)
        break
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    const item = listRef.current?.children[focusedIndex] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex])

  return (
    <div
      ref={listRef}
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-activedescendant={`category-${focusedIndex}`}
    >
      {items.map((item, idx) => (
        <div
          key={item.category}
          id={`category-${idx}`}
          role="option"
          aria-selected={selectedCategory === item.category}
          tabIndex={-1}
          className={cn(
            focusedIndex === idx && 'ring-2 ring-green-500'
          )}
        >
          ...
        </div>
      ))}
    </div>
  )
}
```

```tsx
// budget-detail-panel.tsx - Escape to close
useEffect(() => {
  if (mode !== 'overlay' || !isOpen) return

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose?.()
  }

  document.addEventListener('keydown', handleEscape)
  return () => document.removeEventListener('keydown', handleEscape)
}, [isOpen, mode, onClose])
```

#### Acceptance Criteria
- [ ] Category list navigable with arrow keys
- [ ] Enter/Space selects focused category
- [ ] Escape closes overlay panels
- [ ] Focus visible (ring indicator)
- [ ] Screen reader announces navigation

---

### Task 3.14: Unit Tests for Prediction Logic
**File:** `frontend/src/utils/spending-prediction.test.ts` (NEW)
**Story Points:** 2
**Priority:** MEDIUM

#### Test Cases

```typescript
describe('spending-prediction', () => {
  describe('detectSpendingAnomaly', () => {
    it('detects anomaly when amount > mean + 2*std', () => {
      const dailyAmounts = [100, 120, 110, 105, 115] // mean ~110, std ~7
      const result = detectSpendingAnomaly(dailyAmounts, 500)
      expect(result.isAnomaly).toBe(true)
    })

    it('returns false for normal spending', () => {
      const dailyAmounts = [100, 120, 110, 105, 115]
      const result = detectSpendingAnomaly(dailyAmounts, 115)
      expect(result.isAnomaly).toBe(false)
    })

    it('handles empty array gracefully', () => {
      const result = detectSpendingAnomaly([], 100)
      expect(result.isAnomaly).toBe(false)
    })
  })

  describe('predictCategorySpending', () => {
    it('projects correctly based on daily pace', () => {
      const tracking = {
        category: 'Groceries',
        spent: 30000,
        budgeted: 50000,
        // 15 days elapsed, 15 remaining
      }
      const result = predictCategorySpending(tracking, 15, 15)
      // Pace: 2000/day, projected: 30000 + (2000 * 15) = 60000
      expect(result.predictedTotal).toBe(60000)
      expect(result.exceededBy).toBe(10000)
      expect(result.status).toBe('danger')
    })

    it('returns safe status when under budget', () => {
      const tracking = { spent: 20000, budgeted: 50000 }
      const result = predictCategorySpending(tracking, 20, 10)
      expect(result.status).toBe('safe')
    })

    it('sets confidence based on days elapsed', () => {
      expect(predictCategorySpending({...}, 5, 25).confidence).toBe('low')
      expect(predictCategorySpending({...}, 10, 20).confidence).toBe('medium')
      expect(predictCategorySpending({...}, 20, 10).confidence).toBe('high')
    })
  })

  describe('generatePredictions', () => {
    it('filters to only warning/danger predictions', () => {
      const allocations = [
        { category: 'A', amount: 50000 },
        { category: 'B', amount: 30000 },
      ]
      const tracking = {
        categories: [
          { category: 'A', spent: 45000, budgeted: 50000 }, // danger
          { category: 'B', spent: 10000, budgeted: 30000 }, // safe
        ],
        days_remaining: 10
      }
      const predictions = generatePredictions(allocations, tracking)
      expect(predictions.length).toBe(1)
      expect(predictions[0].category).toBe('A')
    })

    it('sorts by severity (danger first)', () => {
      // ...
    })
  })
})
```

#### Acceptance Criteria
- [ ] All prediction functions have test coverage
- [ ] Edge cases handled (empty data, zero budget, etc.)
- [ ] Tests run in CI pipeline

---

### Task 3.15: Integration Tests for Tab Navigation
**File:** `frontend/src/pages/Budget.test.tsx` (NEW)
**Story Points:** 1
**Priority:** LOW

```typescript
describe('Budget Page - Tab Navigation', () => {
  it('renders all 4 tabs on desktop', () => {
    render(<BudgetPage />, { viewport: { width: 1024 } })
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /categories/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /transactions/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /forecast/i })).toBeInTheDocument()
  })

  it('shows dropdown on mobile', () => {
    render(<BudgetPage />, { viewport: { width: 375 } })
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('persists tab state in URL', async () => {
    render(<BudgetPage />)
    await userEvent.click(screen.getByRole('tab', { name: /forecast/i }))
    expect(window.location.search).toContain('tab=forecast')
  })

  it('restores tab from URL on mount', () => {
    window.history.pushState({}, '', '?tab=transactions')
    render(<BudgetPage />)
    expect(screen.getByRole('tab', { name: /transactions/i })).toHaveAttribute('aria-selected', 'true')
  })
})
```

---

### Task 3.16: Accessibility Audit & Fixes
**Story Points:** 1
**Priority:** MEDIUM

#### Audit Checklist

| Area | Check | Status |
|------|-------|--------|
| Color contrast | Text 4.5:1, Large text 3:1 | ⬜ |
| Focus indicators | Visible on all interactive | ⬜ |
| ARIA labels | Tabs, listbox, status badges | ⬜ |
| Screen reader | Announces tab changes | ⬜ |
| Reduced motion | Respects prefers-reduced-motion | ⬜ |

#### Known Issues to Fix

```tsx
// 1. Add aria-live for prediction alerts
<div role="alert" aria-live="polite">
  {predictions.map(...)}
</div>

// 2. Add skip link for tab content
<a href="#tab-content" className="sr-only focus:not-sr-only">
  Skip to tab content
</a>

// 3. Respect reduced motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
<div className={cn(
  'transition-all',
  prefersReducedMotion && 'transition-none'
)}>
```

---

## Implementation Order

```
Day 1:
├── Task 3.10: Backend API for historical data
│   ├── Add endpoint to budget.py
│   ├── Create service function in frontend
│   └── Update spending-prediction.ts to use history
│
Day 2:
├── Task 3.13: Keyboard navigation
│   ├── Category list keyboard support
│   ├── Escape to close panels
│   └── Focus management
│
Day 3:
├── Task 3.14: Unit tests for predictions
├── Task 3.15: Integration tests for tabs
│
Day 4:
├── Task 3.16: Accessibility audit
├── Final testing & polish
└── Deploy
```

---

## File Changes Summary

### New Files
```
backend/app/schemas/budget.py          (Add history response schema)
frontend/src/utils/spending-prediction.test.ts
frontend/src/pages/Budget.test.tsx
```

### Modified Files
```
backend/app/routes/budget.py           (Add history endpoint)
frontend/src/services/budget-service.ts (Add getCategoryHistory)
frontend/src/utils/spending-prediction.ts (Use historical data)
frontend/src/components/budget/category-list-panel.tsx (Keyboard nav)
frontend/src/components/budget/budget-detail-panel.tsx (Escape key)
```

---

## Story Points Summary

| Task | Points | Priority |
|------|--------|----------|
| 3.10 Backend API | 3 | HIGH |
| 3.13 Keyboard Navigation | 2 | MEDIUM |
| 3.14 Unit Tests | 2 | MEDIUM |
| 3.15 Integration Tests | 1 | LOW |
| 3.16 Accessibility Audit | 1 | MEDIUM |
| **Total** | **9** | |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Prediction accuracy | >80% within 10% margin (with history) |
| Keyboard navigation | 100% WCAG 2.1 AA |
| Test coverage | >80% for prediction utils |
| Accessibility score | 98+ (Lighthouse) |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Historical data query slow | Add index on (user_id, category, date) |
| Too many API calls | Batch history fetch for all categories |
| Breaking existing predictions | Feature flag for history-based predictions |

---

**Ready for implementation. Approve to proceed.**
