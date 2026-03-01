# Phase 2: Status Badges

**Priority:** High | **Effort:** 2 hours | **Risk:** Low

---

## Context Links

- Plan Overview: [plan.md](./plan.md)
- Phase 1: [phase-01-fix-api-bug.md](./phase-01-fix-api-bug.md)
- Allocation Card: `frontend/src/components/budget/budget-allocation-card.tsx`

---

## Overview

Add visual health indicators (badges) to budget allocation cards:
- Green (On Track): <80% spent
- Amber (Caution): 80-99% spent
- Red (Over Budget): >=100% spent

---

## Key Insights

1. `budget-allocation-card.tsx` already calculates `spentPercent` (line 122)
2. Color logic exists in `getProgressBarColor()` (lines 126-131)
3. Status already shows AlertTriangle icon when over budget
4. Need explicit badge component with text + icon

---

## Requirements

1. Display status badge prominently on allocation cards
2. Use icons + colors (accessibility: not color alone)
3. Three states: On Track, Caution, Over Budget
4. Badge should be visible at glance on mobile
5. Use existing color scheme (green/orange/red already in codebase)

---

## Architecture

```
BudgetStatusBadge Component:
  Props: { percentage: number, isOverBudget: boolean }

  Thresholds:
    green:  percentage < 80
    amber:  percentage >= 80 && percentage < 100
    red:    percentage >= 100 (isOverBudget)

  Display:
    [CheckCircle icon] On Track     (green)
    [AlertCircle icon] Caution      (amber/orange)
    [AlertTriangle icon] Over       (red)
```

---

## Related Code Files

### `frontend/src/components/budget/budget-allocation-card.tsx`

Current status display (lines 153-155):
```tsx
{trackingItem && isOverBudget && (
  <AlertTriangle className="w-4 h-4 text-red-500" />
)}
```

Replace with new BudgetStatusBadge component that shows all 3 states.

---

## Implementation Steps

1. **Create helper function or inline logic**
   - Calculate status from `spentPercent` and `isOverBudget`
   - Return status object: { label, icon, colorClass }

2. **Update AllocationCard component**
   - Add status badge next to category name
   - Use appropriate icon: CheckCircle, AlertCircle, AlertTriangle
   - Apply color classes for badge background/text

3. **Styling**
   - Badge: small pill shape with icon + text
   - Responsive: icon-only on mobile, icon+text on larger screens
   - Dark mode support

4. **Add translations**
   - `budget.statusOnTrack`: "On Track"
   - `budget.statusCaution`: "Caution"
   - `budget.statusOver`: "Over"

---

## Todo List

- [ ] Add status calculation function in allocation card
- [ ] Import CheckCircle, AlertCircle icons from lucide-react
- [ ] Create badge UI with icon + text + colors
- [ ] Apply badge styling (pill shape, colors)
- [ ] Add responsive behavior (icon-only on mobile)
- [ ] Add dark mode styles
- [ ] Add i18n translations for status labels
- [ ] Test all three states visually

---

## Success Criteria

- [ ] Green badge shows for <80% spent
- [ ] Amber badge shows for 80-99% spent
- [ ] Red badge shows for >=100% spent
- [ ] Icons are visible alongside colors (accessibility)
- [ ] Badge readable on mobile screens
- [ ] Dark mode renders correctly
- [ ] Translations work for EN/JP

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Badge clutters UI | Low | Keep badge small, use icons |
| Color contrast issues | Medium | Test with accessibility tools |
| Thresholds too strict/lenient | Low | Can adjust later based on feedback |

---

## Security Considerations

- No security concerns - purely UI change
- No user input handling

---

## Code Snippet

```tsx
// Status badge logic
const getBudgetStatus = (spentPercent: number, isOverBudget: boolean) => {
  if (isOverBudget || spentPercent >= 100) {
    return {
      label: t('budget.statusOver'),
      icon: AlertTriangle,
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-700 dark:text-red-400',
    }
  }
  if (spentPercent >= 80) {
    return {
      label: t('budget.statusCaution'),
      icon: AlertCircle,
      bgClass: 'bg-orange-100 dark:bg-orange-900/30',
      textClass: 'text-orange-700 dark:text-orange-400',
    }
  }
  return {
    label: t('budget.statusOnTrack'),
    icon: CheckCircle,
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
  }
}
```

---

## Next Steps

After completing this phase:
1. Verify badges display correctly in all states
2. Proceed to Phase 3: Pacing Indicators
