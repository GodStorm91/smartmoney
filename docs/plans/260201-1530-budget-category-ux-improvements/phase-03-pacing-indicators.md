# Phase 3: Pacing Indicators

**Priority:** High | **Effort:** 1 hour | **Risk:** Low

---

## Context Links

- Plan Overview: [plan.md](./plan.md)
- Phase 2: [phase-02-status-badges.md](./phase-02-status-badges.md)
- Allocation Card: `frontend/src/components/budget/budget-allocation-card.tsx`

---

## Overview

Show pacing information on budget allocation cards:
- "X days left" - days remaining in budget period
- "Y/day pace" - daily spending pace to stay on budget

---

## Key Insights

1. Budget tracking has `month` context from parent component
2. Can calculate days remaining using `date-fns` (already in project)
3. Remaining budget = budgeted - spent (already calculated)
4. Daily pace = remaining / days remaining

---

## Requirements

1. Display days remaining in budget period
2. Calculate and display daily spending pace
3. Handle edge cases: month end, no remaining days
4. Format pace in user's currency
5. Compact display for mobile

---

## Architecture

```
Pacing Calculation:
  today = new Date()
  endOfMonth = lastDayOfMonth(budgetMonth)
  daysRemaining = differenceInDays(endOfMonth, today) + 1

  remaining = budgeted - spent
  dailyPace = remaining / daysRemaining

Display:
  "15 days left - ¥1,000/day"

Edge Cases:
  - Last day of month: "1 day left"
  - Month already passed: Hide pacing
  - Over budget: "Over by ¥X"
```

---

## Related Code Files

### `frontend/src/components/budget/budget-allocation-card.tsx`

Tracking section (lines 277-310):
```tsx
{trackingItem && (
  <div className="mt-3 pt-3 border-t">
    <div className="flex justify-between text-sm mb-1">
      <span>{formatCurrency(spent)} / {formatCurrency(budgeted)}</span>
      <span>{remaining} remaining</span>
    </div>
    // Add pacing info here
  </div>
)}
```

---

## Implementation Steps

1. **Add date-fns imports**
   - `differenceInDays`, `endOfMonth`, `parseISO`, `isAfter`

2. **Calculate pacing values**
   - Parse month string to date
   - Calculate days remaining
   - Calculate daily pace if remaining > 0

3. **Display pacing info**
   - Show below progress bar in tracking section
   - Format: "X days left - ¥Y/day"
   - Gray text, smaller font size

4. **Handle edge cases**
   - Past months: don't show pacing
   - Over budget: show "Over by X" instead of pace
   - Last day: "1 day left"

---

## Todo List

- [ ] Import date-fns functions (differenceInDays, endOfMonth, etc.)
- [ ] Add `month` prop to AllocationCard (or get from parent)
- [ ] Implement days remaining calculation
- [ ] Implement daily pace calculation
- [ ] Add pacing display UI
- [ ] Handle edge cases (past month, over budget, last day)
- [ ] Add i18n translations
- [ ] Test with various budget scenarios

---

## Success Criteria

- [ ] Days remaining shows accurate count
- [ ] Daily pace calculated correctly
- [ ] Currency formatted correctly
- [ ] Past months don't show pacing
- [ ] Over budget shows appropriate message
- [ ] UI compact and readable on mobile

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Timezone issues | Low | Use local date functions |
| Negative pace confusing | Low | Show "Over" message instead |
| Stale data if page open | Low | Pacing updates on refresh |

---

## Security Considerations

- No security concerns - date calculations only
- No user input handling

---

## Code Snippet

```tsx
import { differenceInDays, endOfMonth, parseISO, isAfter, startOfDay } from 'date-fns'

// In AllocationCard component
const calculatePacing = (month: string, remaining: number) => {
  const today = startOfDay(new Date())
  const [year, monthNum] = month.split('-').map(Number)
  const monthEnd = endOfMonth(new Date(year, monthNum - 1))

  // Don't show pacing for past months
  if (isAfter(today, monthEnd)) return null

  const daysLeft = differenceInDays(monthEnd, today) + 1
  if (daysLeft <= 0) return null

  const dailyPace = remaining > 0 ? Math.round(remaining / daysLeft) : 0

  return { daysLeft, dailyPace }
}

// In render
{pacing && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    {t('budget.daysLeft', { count: pacing.daysLeft })} - {formatCurrency(pacing.dailyPace)}/day
  </p>
)}
```

---

## Next Steps

After completing this phase:
1. Verify pacing displays correctly
2. Test edge cases (month end, past month)
3. Proceed to Phase 4: Category Picker
