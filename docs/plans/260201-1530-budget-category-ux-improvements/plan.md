# Budget Category UX Improvements - Implementation Plan

**Date:** 2026-02-01
**Status:** Ready for Implementation
**Brainstorm:** [BRAINSTORM_SUMMARY.md](../260201-budget-category-ux-improvements/BRAINSTORM_SUMMARY.md)

---

## Problem Statement

Critical bug: Frontend sends `categories` param, backend expects `category` - causes no filtering.
User report: Clicking category shows wrong transactions (actually shows ALL transactions).

---

## Implementation Phases

| Phase | Description | Effort | Priority |
|-------|-------------|--------|----------|
| 1 | Fix API Bug - Add `categories` param to backend | 1-2h | Critical |
| 2 | Status Badges - Visual health indicators | 2h | High |
| 3 | Pacing Indicators - Days left + daily pace | 1h | High |
| 4 | Category Picker - Use HierarchicalCategoryPicker | 3h | High |
| 5 | Parent Context - Show parent group label | 30min | Medium |
| 6 | Breadcrumb Navigation - Show hierarchy path | 2h | Medium |

**Total Estimated Effort:** 9-10 hours

---

## Key Files to Modify

### Backend
- `backend/app/routes/transactions.py` - Add `categories` query param
- `backend/app/services/transaction_service.py` - Multi-category IN clause

### Frontend
- `frontend/src/components/budget/budget-allocation-card.tsx` - Status badge, pacing
- `frontend/src/components/budget/tabs/categories-tab.tsx` - Picker integration
- `frontend/src/components/budget/budget-detail-panel.tsx` - Breadcrumb nav

---

## Success Criteria

- [ ] Category filtering returns correct transactions
- [ ] Status badges show green/amber/red based on spend %
- [ ] Pacing shows "X days left, Y/day pace"
- [ ] Category picker matches Transaction page UX
- [ ] All changes work on mobile + desktop
- [ ] Backend tests pass, frontend builds clean

---

## Constraints

- Backward compatible with existing `category` param
- Status badge colors accessible (icons + colors)
- Mobile-first approach
- Follow existing code patterns

---

## Phase Files

1. [phase-01-fix-api-bug.md](./phase-01-fix-api-bug.md)
2. [phase-02-status-badges.md](./phase-02-status-badges.md)
3. [phase-03-pacing-indicators.md](./phase-03-pacing-indicators.md)
4. [phase-04-category-picker.md](./phase-04-category-picker.md)
5. [phase-05-parent-context.md](./phase-05-parent-context.md)
6. [phase-06-breadcrumb-nav.md](./phase-06-breadcrumb-nav.md)
