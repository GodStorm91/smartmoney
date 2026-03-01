# Phase 5: Parent Category Context Label

**Priority:** Medium | **Effort:** 30 minutes | **Risk:** Low

---

## Context Links

- Plan Overview: [plan.md](./plan.md)
- Phase 4: [phase-04-category-picker.md](./phase-04-category-picker.md)
- Allocation Card: `frontend/src/components/budget/budget-allocation-card.tsx`

---

## Overview

Show parent group name in allocation cards for hierarchy clarity.
Example: "Groceries" shows "Parent: Food & Dining" label.

---

## Key Insights

1. Category tree already available via `useCategoryTree` hook
2. Can look up parent for any child category
3. Parent context helps users understand category hierarchy
4. Small UI addition, high clarity value

---

## Requirements

1. Show parent category name below child category name
2. Only show when category is a child (not a parent)
3. Subtle styling (smaller, gray text)
4. Handle case where parent not found gracefully

---

## Architecture

```
Allocation Card Header:
  ┌─────────────────────────────┐
  │ 🛒 Groceries        [badge] │
  │ Parent: Food & Dining       │  ← NEW
  └─────────────────────────────┘

Lookup Logic:
  - Get category tree from useCategoryTree hook
  - Find parent that contains this category as child
  - Display parent name if found
```

---

## Related Code Files

### `frontend/src/components/budget/budget-allocation-card.tsx`

Header section (lines 150-156):
```tsx
<div className="flex items-center gap-2 flex-1 min-w-0">
  <h4 className="font-semibold truncate">{allocation.category}</h4>
  {/* Add parent context here */}
</div>
```

---

## Implementation Steps

1. **Import useCategoryTree hook**
2. **Create parent lookup function**
   - Search expense categories for matching child
   - Return parent name if found
3. **Add parent label UI**
   - Below category name
   - Small, gray text
4. **Handle edge cases**
   - Category is parent itself (no label)
   - Category not found in tree (no label)

---

## Todo List

- [ ] Import useCategoryTree in allocation card
- [ ] Create findParentCategory helper function
- [ ] Add parent label below category name
- [ ] Style label (text-xs, text-gray-500)
- [ ] Test with parent and child categories
- [ ] Verify dark mode styling

---

## Success Criteria

- [ ] Child categories show parent name
- [ ] Parent categories don't show extra label
- [ ] Label styled subtly (doesn't dominate)
- [ ] Works in dark mode
- [ ] No performance impact (lookup is fast)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Extra API call | Low | useCategoryTree likely cached |
| Cluttered UI | Low | Use subtle styling |

---

## Security Considerations

- No security concerns - display only

---

## Code Snippet

```tsx
import { useCategoryTree } from '@/hooks/useCategories'

// In AllocationCard
const { data: categoryTree } = useCategoryTree()

const findParentCategory = (childName: string): string | null => {
  if (!categoryTree) return null
  for (const parent of categoryTree.expense) {
    if (parent.children.some(c => c.name === childName)) {
      return parent.name
    }
  }
  return null
}

const parentCategory = findParentCategory(allocation.category)

// In render
<div className="flex items-center gap-2 flex-1 min-w-0">
  <div>
    <h4 className="font-semibold truncate">{allocation.category}</h4>
    {parentCategory && (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('budget.parentCategory', { parent: parentCategory })}
      </p>
    )}
  </div>
</div>
```

---

## Next Steps

After completing this phase:
1. Verify parent labels display correctly
2. Proceed to Phase 6: Breadcrumb Navigation
