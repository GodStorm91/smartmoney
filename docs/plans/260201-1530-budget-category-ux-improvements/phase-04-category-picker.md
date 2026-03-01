# Phase 4: Consistent Category Picker

**Priority:** High | **Effort:** 3 hours | **Risk:** Medium

---

## Context Links

- Plan Overview: [plan.md](./plan.md)
- Phase 3: [phase-03-pacing-indicators.md](./phase-03-pacing-indicators.md)
- HierarchicalCategoryPicker: `frontend/src/components/transactions/HierarchicalCategoryPicker.tsx`
- Categories Tab: `frontend/src/components/budget/tabs/categories-tab.tsx`

---

## Overview

Replace budget's custom category dropdown with the same `HierarchicalCategoryPicker` used on Transaction page.
Ensures consistent UX across the app and familiar interaction pattern.

---

## Key Insights

1. `HierarchicalCategoryPicker` already exists and works well
2. Shows parent/child hierarchy clearly
3. Supports adding custom categories
4. Mobile-optimized (works in modal)
5. Budget needs: show which categories already have allocations

---

## Requirements

1. Reuse `HierarchicalCategoryPicker` for adding budget allocations
2. Show categories that already have allocations as disabled/grayed
3. Support adding allocation to parent OR child category
4. Maintain existing modal flow for adding categories
5. Work on both mobile and desktop

---

## Architecture

```
Budget Add Category Flow:
  1. User clicks "Add Category" button
  2. Modal opens with HierarchicalCategoryPicker
  3. Categories with existing allocations shown disabled
  4. User selects category (parent or child)
  5. Allocation created, modal closes

Picker Modifications:
  - New prop: `disabledCategories?: string[]`
  - Visual: grayed out + "Already budgeted" tooltip
  - Still navigable but not selectable
```

---

## Related Code Files

### `frontend/src/components/transactions/HierarchicalCategoryPicker.tsx`

Current props:
```tsx
interface HierarchicalCategoryPickerProps {
  selected: string
  onSelect: (categoryName: string, parentName: string) => void
  isIncome?: boolean
}
```

Need to add:
```tsx
disabledCategories?: string[]  // Categories that can't be selected
showParentAsSelectable?: boolean  // Allow selecting parent categories
```

### `frontend/src/components/budget/tabs/categories-tab.tsx`

Current add category flow likely uses custom dropdown.
Replace with HierarchicalCategoryPicker in modal.

### Potential new file: `frontend/src/components/budget/budget-category-modal.tsx`

Wraps HierarchicalCategoryPicker with modal chrome for budget context.

---

## Implementation Steps

1. **Extend HierarchicalCategoryPicker**
   - Add `disabledCategories` prop
   - Add visual styling for disabled categories
   - Add `showParentAsSelectable` prop (optional)
   - Prevent selection of disabled items

2. **Create BudgetCategoryModal component**
   - Modal wrapper for picker
   - Pass existing allocation categories as disabled
   - Handle selection callback
   - Create allocation on selection

3. **Update categories-tab.tsx**
   - Replace existing "Add Category" dropdown/flow
   - Use BudgetCategoryModal component
   - Pass current allocations to determine disabled

4. **Styling**
   - Disabled categories: opacity-50, cursor-not-allowed
   - Add tooltip: "Already in budget"
   - Maintain dark mode support

---

## Todo List

- [ ] Add `disabledCategories` prop to HierarchicalCategoryPicker
- [ ] Style disabled categories (grayed, not selectable)
- [ ] Create BudgetCategoryModal component
- [ ] Integrate modal in categories-tab.tsx
- [ ] Pass existing allocation categories as disabled
- [ ] Handle category selection and allocation creation
- [ ] Test parent vs child category selection
- [ ] Test mobile modal behavior
- [ ] Verify dark mode styling

---

## Success Criteria

- [ ] HierarchicalCategoryPicker opens when adding budget category
- [ ] Categories with allocations shown as disabled
- [ ] Can select available parent or child categories
- [ ] Selection creates new budget allocation
- [ ] Works correctly on mobile (modal)
- [ ] Works correctly on desktop (modal or inline)
- [ ] Consistent look with Transaction page picker

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking HierarchicalCategoryPicker | Medium | Add props carefully, test transactions page |
| Parent+child allocation conflicts | Low | Allow both, warn in UI |
| Modal UX issues on mobile | Low | Reuse tested modal patterns |

---

## Security Considerations

- No security concerns - UI/UX change only
- Category data already validated by backend

---

## Code Snippet

```tsx
// Extended HierarchicalCategoryPicker props
interface HierarchicalCategoryPickerProps {
  selected: string
  onSelect: (categoryName: string, parentName: string) => void
  isIncome?: boolean
  disabledCategories?: string[]  // NEW
}

// Disabled category styling
<button
  key={child.id}
  type="button"
  onClick={() => !isDisabled && handleChildClick(child)}
  disabled={isDisabled}
  className={cn(
    'flex flex-col items-center justify-center p-3 rounded-lg',
    isDisabled && 'opacity-50 cursor-not-allowed',
    // ... other styles
  )}
>

// BudgetCategoryModal
interface BudgetCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectCategory: (category: string, parent: string) => void
  existingCategories: string[]  // For disabling
}
```

---

## Next Steps

After completing this phase:
1. Verify picker works for adding budget allocations
2. Ensure disabled categories clearly indicated
3. Proceed to Phase 5: Parent Context
