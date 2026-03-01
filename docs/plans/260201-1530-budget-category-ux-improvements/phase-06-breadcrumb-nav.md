# Phase 6: Breadcrumb Navigation

**Priority:** Medium | **Effort:** 2 hours | **Risk:** Low

---

## Context Links

- Plan Overview: [plan.md](./plan.md)
- Phase 5: [phase-05-parent-context.md](./phase-05-parent-context.md)
- Detail Panel: `frontend/src/components/budget/budget-detail-panel.tsx`

---

## Overview

Add breadcrumb navigation in budget detail panel.
Example: "Budget > Categories > Food & Dining > Groceries"

---

## Key Insights

1. Detail panel shows single category's transactions
2. Users need context of where they are in hierarchy
3. Breadcrumbs allow quick navigation back
4. Pattern common in budget apps (YNAB, Monarch)

---

## Requirements

1. Show breadcrumb path in detail panel header
2. Each segment clickable (except current)
3. Path: Budget > Categories > [Parent] > [Child]
4. Compact display on mobile
5. Works in both overlay and inline modes

---

## Architecture

```
Breadcrumb Structure:
  Budget > Categories > Food & Dining > Groceries
  ↑         ↑           ↑               ↑ current
  link      link        link            (not clickable)

Navigation:
  - "Budget" → close panel, go to budget overview
  - "Categories" → close panel, stay on categories tab
  - "Food & Dining" → show parent category detail
  - "Groceries" → current (no action)

Mobile:
  - Truncate middle segments if needed
  - Show: "... > Food & Dining > Groceries"
```

---

## Related Code Files

### `frontend/src/components/budget/budget-detail-panel.tsx`

Header section (lines 241-243 inline mode, 307-316 overlay mode):
```tsx
<div className="flex items-center justify-between px-4 py-3 border-b">
  <h2 className="text-lg font-semibold">{category}</h2>
  {/* Add breadcrumb above or replace h2 */}
</div>
```

---

## Implementation Steps

1. **Create BudgetBreadcrumb component**
   - Accept category, parent, onNavigate props
   - Render clickable segments
   - Handle mobile truncation

2. **Integrate in detail panel**
   - Replace or augment header
   - Wire up navigation callbacks

3. **Navigation logic**
   - "Budget" click → onClose + navigate to budget
   - Parent click → select parent category
   - Current → no action

4. **Styling**
   - Small text, gray color
   - Chevron separators
   - Hover states for links
   - Mobile: truncate with "..."

---

## Todo List

- [ ] Create BudgetBreadcrumb component
- [ ] Add props: category, parentCategory, onNavigate
- [ ] Render breadcrumb segments with chevrons
- [ ] Add click handlers for navigation
- [ ] Integrate in budget-detail-panel.tsx
- [ ] Add mobile truncation logic
- [ ] Test navigation in overlay mode
- [ ] Test navigation in inline mode
- [ ] Verify dark mode styling

---

## Success Criteria

- [ ] Breadcrumb shows correct path
- [ ] Clicking segments navigates correctly
- [ ] Current segment not clickable
- [ ] Mobile display compact and readable
- [ ] Works in both overlay and inline modes
- [ ] Accessible keyboard navigation

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Navigation complexity | Low | Simple callbacks |
| Deep hierarchy confusion | Low | Max 4 segments |
| Mobile space constraints | Low | Truncation logic |

---

## Security Considerations

- No security concerns - navigation UI only

---

## Code Snippet

```tsx
// BudgetBreadcrumb.tsx
interface BreadcrumbProps {
  category: string
  parentCategory?: string | null
  onNavigateHome: () => void
  onNavigateParent?: () => void
}

export function BudgetBreadcrumb({
  category,
  parentCategory,
  onNavigateHome,
  onNavigateParent
}: BreadcrumbProps) {
  const { t } = useTranslation('common')

  return (
    <nav className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
      <button onClick={onNavigateHome} className="hover:text-gray-700">
        {t('budget.title')}
      </button>
      <ChevronRight className="w-4 h-4 mx-1" />
      <span>{t('budget.categories')}</span>
      {parentCategory && (
        <>
          <ChevronRight className="w-4 h-4 mx-1" />
          <button onClick={onNavigateParent} className="hover:text-gray-700">
            {parentCategory}
          </button>
        </>
      )}
      <ChevronRight className="w-4 h-4 mx-1" />
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {category}
      </span>
    </nav>
  )
}
```

---

## Next Steps

After completing all phases:
1. Full integration testing
2. Mobile responsiveness review
3. Accessibility audit
4. User testing and feedback
