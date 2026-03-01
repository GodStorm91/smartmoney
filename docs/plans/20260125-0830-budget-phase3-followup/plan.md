# Budget UI Phase 3 Follow-up - Implementation Plan

**Created:** 2026-01-25
**Status:** Ready for Implementation
**Total Story Points:** 9 SP
**Estimated Duration:** 3-4 days (1 developer)

---

## Context

Phase 3 core features deployed (v20260125.1):
- Desktop tabbed interface (4 tabs)
- Split-view category management
- Predictive overspending warnings (ML-lite)
- Responsive design

**Remaining:** Backend API for historical data, keyboard navigation, testing, accessibility.

---

## Phases

| Phase | Description | Tasks | SP | Priority |
|-------|-------------|-------|----|----|
| [Phase 1](./phase-01-backend-api.md) | Backend API for Historical Data | 3.10 | 3 | HIGH |
| [Phase 2](./phase-02-keyboard-nav.md) | Keyboard Navigation Enhancement | 3.13 | 2 | MEDIUM |
| [Phase 3](./phase-03-testing-a11y.md) | Testing & Accessibility | 3.14, 3.15, 3.16 | 4 | MEDIUM |

---

## Implementation Order

```
Day 1: Phase 1 - Backend API (3.10)
Day 2: Phase 2 - Keyboard Navigation (3.13)
Day 3: Phase 3 - Unit Tests (3.14), Integration Tests (3.15)
Day 4: Phase 3 - Accessibility Audit (3.16), Final Testing
```

---

## Key Files

**Backend (New/Modified):**
- `backend/app/routes/budgets.py` - Add history endpoint
- `backend/app/schemas/budget.py` - Add history response schema

**Frontend (New/Modified):**
- `frontend/src/services/budget-service.ts` - Add getCategoryHistory
- `frontend/src/utils/spending-prediction.ts` - Use historical data
- `frontend/src/utils/spending-prediction.test.ts` - NEW
- `frontend/src/pages/Budget.test.tsx` - NEW
- `frontend/src/components/budget/category-list-panel.tsx` - Keyboard nav
- `frontend/src/components/budget/budget-detail-panel.tsx` - Escape key

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Prediction accuracy | >80% within 10% margin (with history) |
| Keyboard navigation | 100% WCAG 2.1 AA |
| Test coverage | >80% for prediction utils |
| Accessibility score | 98+ (Lighthouse) |

---

## Dependencies

- Existing `BudgetTrackingService` for spending calculations
- Exchange rate service for multi-currency conversion
- Vitest + React Testing Library for frontend tests

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Historical data query slow | MEDIUM | Add index on (user_id, category, date) |
| Breaking existing predictions | LOW | Feature flag for history-based predictions |
| Test flakiness | LOW | Use deterministic test data |

---

**Approve to proceed with implementation.**
