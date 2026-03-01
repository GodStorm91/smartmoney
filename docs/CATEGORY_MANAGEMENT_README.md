# Category Management UX Documentation Index

Quick navigation for SmartMoney category management implementation.

## Documents

### 1. **CATEGORY_MANAGEMENT_UX_RESEARCH.md** (820 LOC)
**Complete research report on personal finance app category UX patterns**
- Industry analysis (YNAB, Monarch Money, Copilot)
- Category hierarchy best practices (2-level max, parent-child aggregation)
- Transaction filtering patterns
- Category picker consistency across devices
- Visual hierarchy and navigation patterns
- SmartMoney-specific recommendations
- Unresolved questions for team
- Full cited sources

**When to read:** Before starting implementation to understand "why"

---

### 2. **CATEGORY_MANAGEMENT_IMPLEMENTATION_GUIDE.md** (632 LOC)
**Step-by-step implementation instructions for 5 priorities**
- Priority 1: Status Badges (1-2 weeks)
- Priority 2: Parent Category Context (1 week)
- Priority 3: Days Remaining + Pacing (1 week)
- Priority 4: Desktop Category Picker Adaptation (2 weeks)
- Priority 5: Breadcrumb Navigation (2 weeks)

Code patterns, file modifications, testing checklists, accessibility compliance.

**When to read:** During implementation; use as working reference

---

### 3. Split Technical Guides (One per Priority)
For focus during active development:

- **category-management-priority-1-status-badges.md** - Status badge component
- **category-management-priority-2-parent-context.md** - Parent category display
- **category-management-priority-3-pacing.md** - Days remaining / daily pace
- **category-management-priority-4-desktop-picker.md** - Desktop dropdown picker
- **category-management-priority-5-breadcrumbs.md** - Breadcrumb navigation

*(To be created on-demand when starting each priority)*

---

## Quick Start for Developers

1. **Read First:** Section 1 of CATEGORY_MANAGEMENT_UX_RESEARCH.md (Executive Summary)
2. **Understand Design Decisions:** Section 11 of the research doc
3. **Pick Priority:** Choose from CATEGORY_MANAGEMENT_IMPLEMENTATION_GUIDE.md
4. **Code Pattern:** Follow the code examples in the implementation guide
5. **Verify Data:** Use "Data Flow Verification" section before coding
6. **Test:** Use provided testing checklists
7. **Accessibility:** Check against WCAG compliance checklist

---

## Decision Matrix (Already Made)

| Decision | Chosen | Why | Alternative |
|----------|--------|-----|-------------|
| Hierarchy Depth | 2 levels max | UX clarity | Deeper nesting (rejected) |
| Parent Aggregation | Include children | User expectation | Parent-only (rejected) |
| Picker Consistency | HierarchicalCategoryPicker everywhere | Reduces friction | Separate pickers per screen |
| Desktop Picker | Dropdown mode | Efficient selection | Modal (redundant) |
| Status Badge | Top-right corner | Quick visual scan | Badge in different location |

---

## Current SmartMoney Implementation Status

### ✅ Already Implemented
- 2-level category hierarchy (CategoryParent/CategoryChild types)
- HierarchicalCategoryPicker with back navigation
- Color-coded progress bars in AllocationCard
- Mobile-first budget layout
- Tabbed interface (Overview, Categories, Transactions, Forecast)

### 🔲 Ready to Add (In Priority Order)
1. Status badges (on-track/caution/over-budget)
2. Parent category context display
3. Days remaining + daily pace indicators
4. Desktop category picker dropdown
5. Breadcrumb navigation for drill-down

### ❓ Need Verification
- Does BudgetAllocation include parent_name/parent_icon?
- Is parent budget aggregating child transactions?
- Are category_ids used (vs category_names) in allocations?

---

## File Dependencies

```
CATEGORY_MANAGEMENT_UX_RESEARCH.md
├─ Cited by: CATEGORY_MANAGEMENT_IMPLEMENTATION_GUIDE.md
└─ Provides rationale for all design decisions

CATEGORY_MANAGEMENT_IMPLEMENTATION_GUIDE.md
├─ Code patterns used in: Priority 1-5 guides (TBD)
├─ References: types/budget.ts, components/budget/
└─ Data flows: Budget API → AllocationCard → UI

SmartMoney Codebase
├─ frontend/src/types/budget.ts (BudgetAllocation type)
├─ frontend/src/pages/Budget.tsx (main page)
├─ frontend/src/components/budget/ (all budget components)
├─ frontend/src/components/transactions/HierarchicalCategoryPicker.tsx
└─ frontend/src/types/category.ts (CategoryParent/CategoryChild)
```

---

## Key Numbers (For Planning)

| Item | Estimate |
|------|----------|
| Priority 1 (Status Badges) | 1-2 weeks |
| Priority 2 (Parent Context) | 1 week |
| Priority 3 (Pacing) | 1 week |
| Priority 4 (Desktop Picker) | 2 weeks |
| Priority 5 (Breadcrumbs) | 2 weeks |
| **Total Implementation** | **7-9 weeks** |
| Testing & Polish | 1-2 weeks |
| **Total with Testing** | **8-11 weeks** |

---

## Before Starting Implementation

### Team Coordination
- [ ] Confirm design decisions with product team (use Decision Matrix)
- [ ] Verify data flow with backend team (use Data Flow Verification section)
- [ ] Review existing budget API response structure
- [ ] Confirm Tailwind color palette matches SmartMoney standards

### Code Review Prerequisites
- [ ] Read `docs/code-standards.md` (Python/TypeScript standards)
- [ ] Review existing budget components (Pattern recognition)
- [ ] Check `docs/design-guidelines.md` (Color/typography)

### Accessibility Review
- [ ] Verify current color contrast ratios (dark + light mode)
- [ ] Test keyboard navigation in existing components
- [ ] Confirm touch target sizes (44x48px minimum)

---

## Related Documentation

- **Budget UX Research (Broader):** `docs/budget-ui-ux-research.md`
- **Code Standards:** `docs/code-standards.md`
- **Design Guidelines:** `docs/design-guidelines.md`
- **System Architecture:** `docs/system-architecture.md`

---

## Glossary

- **Parent Category:** Top-level category group (e.g., "Food", "Transportation")
- **Child Category:** Specific category under parent (e.g., "Groceries" under "Food")
- **Budget Aggregation:** Summing child category spending into parent category total
- **Status Badge:** Visual indicator (✓/⚠/🚨) showing budget status at a glance
- **BudgetAllocation:** One row in budget representing a category + allocated amount
- **BudgetTrackingItem:** Runtime spending data for a category (spent, remaining, etc.)
- **HierarchicalCategoryPicker:** SmartMoney component for selecting categories (parent → child navigation)
- **Breadcrumb:** Navigation trail showing: Budget > Category > Parent > Child

---

**Last Updated:** February 1, 2026
**Status:** Research Complete, Ready for Implementation
**Next Step:** Review research doc → pick Priority 1 → start implementation
