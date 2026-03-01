# Phase 3: Testing & Accessibility

**Tasks:** 3.14, 3.15, 3.16
**Story Points:** 4 (2+1+1)
**Priority:** MEDIUM
**Status:** Pending

---

## Context Links

- [Main Plan](./plan.md)
- [Original Specs](../20260125-0355-budget-ui-phase3/phase3-followup-plan.md)

---

## Task 3.14: Unit Tests for Prediction Logic (2 SP)

### New File: `frontend/src/utils/spending-prediction.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  detectSpendingAnomaly,
  predictCategorySpending,
  generatePredictions,
  calculateBudgetForecast
} from './spending-prediction'

describe('spending-prediction', () => {
  describe('detectSpendingAnomaly', () => {
    it('detects anomaly when amount > mean + 2*std', () => {
      const dailyAmounts = [100, 120, 110, 105, 115]
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

    it('handles < 5 data points', () => {
      const result = detectSpendingAnomaly([100, 200], 500)
      expect(result.isAnomaly).toBe(false)
    })
  })

  describe('predictCategorySpending', () => {
    const baseItem = {
      category: 'Food',
      budgeted: 50000,
      spent: 30000,
      remaining: 20000,
      percentage: 60,
      status: 'green' as const
    }

    it('projects correctly based on daily pace', () => {
      const result = predictCategorySpending(baseItem, 15, 15)
      expect(result.predictedTotal).toBe(60000)
      expect(result.exceededBy).toBe(10000)
      expect(result.status).toBe('danger')
    })

    it('returns safe status when under budget', () => {
      const result = predictCategorySpending(
        { ...baseItem, spent: 20000 }, 10, 20
      )
      expect(result.status).toBe('safe')
    })

    it('sets confidence based on days elapsed', () => {
      expect(predictCategorySpending(baseItem, 25, 5).confidence).toBe('low')
      expect(predictCategorySpending(baseItem, 20, 10).confidence).toBe('medium')
      expect(predictCategorySpending(baseItem, 10, 20).confidence).toBe('high')
    })

    it('handles zero budget gracefully', () => {
      const result = predictCategorySpending(
        { ...baseItem, budgeted: 0 }, 15, 15
      )
      expect(result.status).toBe('danger')
    })
  })

  describe('generatePredictions', () => {
    it('filters to only warning/danger predictions', () => {
      const tracking = {
        month: '2026-01',
        monthly_income: 300000,
        days_remaining: 10,
        safe_to_spend_today: 5000,
        total_budgeted: 250000,
        total_spent: 200000,
        categories: [
          { category: 'A', budgeted: 50000, spent: 45000, remaining: 5000, percentage: 90, status: 'orange' },
          { category: 'B', budgeted: 30000, spent: 10000, remaining: 20000, percentage: 33, status: 'green' }
        ]
      }
      const predictions = generatePredictions([], tracking)
      expect(predictions.length).toBe(1)
      expect(predictions[0].category).toBe('A')
    })

    it('sorts by severity (danger first)', () => {
      const tracking = {
        month: '2026-01',
        monthly_income: 300000,
        days_remaining: 5,
        safe_to_spend_today: 2000,
        total_budgeted: 100000,
        total_spent: 80000,
        categories: [
          { category: 'A', budgeted: 50000, spent: 40000, remaining: 10000, percentage: 80, status: 'orange' },
          { category: 'B', budgeted: 50000, spent: 55000, remaining: -5000, percentage: 110, status: 'red' }
        ]
      }
      const predictions = generatePredictions([], tracking)
      expect(predictions[0].category).toBe('B')
    })
  })

  describe('calculateBudgetForecast', () => {
    it('calculates overall status correctly', () => {
      const tracking = {
        month: '2026-01',
        monthly_income: 300000,
        days_remaining: 10,
        safe_to_spend_today: 5000,
        total_budgeted: 250000,
        total_spent: 200000,
        savings_target: 50000,
        categories: []
      }
      const forecast = calculateBudgetForecast(tracking)
      expect(forecast.overallStatus).toBe('danger')
    })
  })
})
```

### Todo List (3.14)

- [ ] Create `spending-prediction.test.ts`
- [ ] Test `detectSpendingAnomaly()` edge cases
- [ ] Test `predictCategorySpending()` calculations
- [ ] Test `generatePredictions()` filtering/sorting
- [ ] Test `calculateBudgetForecast()` status
- [ ] Ensure tests run in CI (`npm run test:run`)

---

## Task 3.15: Integration Tests for Tab Navigation (1 SP)

### New File: `frontend/src/pages/Budget.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Note: Need test wrapper for Router/Query providers

describe('Budget Page - Tab Navigation', () => {
  it('renders all 4 tabs on desktop', () => {
    // TODO: render with viewport mock
    // expect tabs: Overview, Categories, Transactions, Forecast
  })

  it('shows dropdown on mobile', () => {
    // TODO: render with mobile viewport
    // expect combobox instead of tablist
  })

  it('persists tab state in URL', async () => {
    // TODO: click tab, verify URL search param
  })

  it('restores tab from URL on mount', () => {
    // TODO: navigate with ?tab=transactions, verify active
  })
})
```

### Todo List (3.15)

- [ ] Create `Budget.test.tsx`
- [ ] Add test wrapper with Router/Query providers
- [ ] Test desktop tab rendering
- [ ] Test mobile dropdown rendering
- [ ] Test URL persistence

---

## Task 3.16: Accessibility Audit (1 SP)

### Audit Checklist

| Area | Check | Status |
|------|-------|--------|
| Color contrast | Text 4.5:1, Large text 3:1 | Pending |
| Focus indicators | Visible on all interactive | Pending |
| ARIA labels | Tabs, listbox, status badges | Pending |
| Screen reader | Announces tab changes | Pending |
| Reduced motion | Respects prefers-reduced-motion | Pending |

### Fixes Required

1. Add aria-live for prediction alerts:
```tsx
<div role="alert" aria-live="polite">
  {predictions.map(...)}
</div>
```

2. Add skip link for tab content:
```tsx
<a href="#tab-content" className="sr-only focus:not-sr-only">
  Skip to tab content
</a>
```

3. Respect reduced motion:
```tsx
const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

<div className={cn(
  'transition-all',
  prefersReducedMotion && 'transition-none'
)}>
```

### Todo List (3.16)

- [ ] Run Lighthouse accessibility audit
- [ ] Fix color contrast issues (if any)
- [ ] Add aria-live to prediction alerts
- [ ] Add skip link for tab content
- [ ] Add reduced motion support
- [ ] Test with VoiceOver/NVDA
- [ ] Verify 98+ Lighthouse score

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Unit test coverage | >80% for prediction utils |
| Integration tests | 4 key scenarios pass |
| Lighthouse a11y | 98+ score |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test flakiness | LOW | Use deterministic data |
| a11y regressions | LOW | Add to CI checks |

---

## Next Steps

After all phases complete:
1. Final testing & polish
2. Deploy to staging
3. User acceptance testing
