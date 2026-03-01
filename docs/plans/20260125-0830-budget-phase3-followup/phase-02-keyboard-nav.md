# Phase 2: Keyboard Navigation Enhancement

**Task:** 3.13
**Story Points:** 2
**Priority:** MEDIUM
**Status:** Pending

---

## Context Links

- [Main Plan](./plan.md)
- [Original Specs](../20260125-0355-budget-ui-phase3/phase3-followup-plan.md)

---

## Overview

Enhance keyboard accessibility for budget UI. Category list partially implemented; needs Home/End, Enter/Space, Escape. Detail panel needs Escape to close.

---

## Key Insights

1. `category-list-panel.tsx` has basic ArrowUp/Down - extend it
2. `budget-detail-panel.tsx` has overlay mode needing Escape handler
3. Current focus ring uses `focus-visible:ring-green-500` - keep consistent
4. ARIA roles already in place (`role="listbox"`, `role="option"`)

---

## Requirements

| Key | Context | Action |
|-----|---------|--------|
| ArrowUp/Down | Category list | Navigate items (exists) |
| Enter/Space | Category list | Select focused item (add) |
| Home/End | Category list | Jump to first/last (add) |
| Escape | Detail panel overlay | Close panel (add) |

---

## Related Code Files

| File | Changes |
|------|---------|
| `frontend/src/components/budget/category-list-panel.tsx` | Add keyboard handlers |
| `frontend/src/components/budget/budget-detail-panel.tsx` | Add Escape handler |

---

## Implementation Steps

### Step 1: Enhance category-list-panel.tsx

Current state (lines 42-52):
```tsx
const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
  if (e.key === 'ArrowDown') { ... }
  else if (e.key === 'ArrowUp') { ... }
}
```

Add Home/End/Enter/Space:
```tsx
const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      const nextIndex = index < allocations.length - 1 ? index + 1 : 0
      onSelectCategory(allocations[nextIndex].category)
      break
    case 'ArrowUp':
      e.preventDefault()
      const prevIndex = index > 0 ? index - 1 : allocations.length - 1
      onSelectCategory(allocations[prevIndex].category)
      break
    case 'Home':
      e.preventDefault()
      onSelectCategory(allocations[0].category)
      break
    case 'End':
      e.preventDefault()
      onSelectCategory(allocations[allocations.length - 1].category)
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      onSelectCategory(allocations[index].category)
      break
  }
}
```

### Step 2: Add Escape handler to budget-detail-panel.tsx

Add after line 60:
```tsx
// Escape key to close overlay panel
useEffect(() => {
  if (mode !== 'overlay' || !isOpen) return

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  document.addEventListener('keydown', handleEscape)
  return () => document.removeEventListener('keydown', handleEscape)
}, [isOpen, mode, onClose])
```

### Step 3: Ensure focus management

Add `scrollIntoView` for selected item:
```tsx
useEffect(() => {
  const selectedIdx = allocations.findIndex(a => a.category === selectedCategory)
  if (selectedIdx >= 0) {
    const el = document.getElementById(`category-item-${selectedIdx}`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}, [selectedCategory])
```

---

## Todo List

- [ ] Add Home/End keys to category-list-panel.tsx
- [ ] Add Enter/Space selection to category-list-panel.tsx
- [ ] Add Escape key handler to budget-detail-panel.tsx
- [ ] Add scrollIntoView for focus management
- [ ] Add `id` attributes to category items for scroll target
- [ ] Test with screen reader (VoiceOver/NVDA)

---

## Success Criteria

- [ ] Category list navigable with arrow keys
- [ ] Home/End jump to first/last item
- [ ] Enter/Space selects focused category
- [ ] Escape closes overlay panels
- [ ] Focus visible (ring indicator)
- [ ] Screen reader announces navigation

---

## Next Steps

After completion, proceed to [Phase 3: Testing & Accessibility](./phase-03-testing-a11y.md)
