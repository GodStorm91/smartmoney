# Phase 1: Delta Badges + Top 3 Focus Areas

**Date:** 2026-02-11
**Priority:** P0
**Status:** Planned
**Estimated Effort:** ~3 days

---

## Context Links

- Master plan: [plan.md](./plan.md)
- Current report page: `frontend/src/pages/MonthlyReport.tsx` (199 lines)
- Budget adherence table: `frontend/src/components/report/BudgetAdherenceTable.tsx` (77 lines)
- Report schemas: `backend/app/schemas/report.py` (89 lines)
- Report service: `backend/app/services/monthly_report_service.py` (198 lines)
- Dashboard service (change calc): `backend/app/services/dashboard_service.py` (123 lines)

## Overview

Add MoM change indicators to all report metrics + replace the all-categories budget table with a focused "Top 3" view showing only the most important spending issues.

## Key Insights

- `ReportSummary` already has `income_change`, `expense_change`, `net_change` (% vs prev month)
- `MetricCard` already renders change badges with color — reuse pattern for per-category badges
- `BudgetCategoryStatus` has `status` field (normal/threshold_50/threshold_80/over_budget) — use for ranking
- `BudgetAlertService.calculate_category_spending()` queries by month — can be called for prev month too
- Dashboard `_calculate_change()` formula already exists — reuse for per-category deltas

## Requirements

### R1: Per-Category Delta Badges
- Each category in budget adherence gets a `+X%` / `-X%` badge showing MoM spending change
- Color logic: spending down = green (good), spending up = red (bad)
- Badge appears inline next to category name
- If previous month has no data for a category, show "New" badge in neutral color

### R2: Top 3 Focus Areas
- Replace full BudgetAdherenceTable with FocusAreas component showing max 3 items
- Priority ranking: over_budget (red) > threshold_80 (amber) > threshold_50 (yellow) > under_budget (green, only if room)
- Each item shows: status icon, category name, amount over/under budget, concrete suggestion
- "See all categories" expandable link that reveals full BudgetAdherenceTable
- Rule-based suggestions (no AI):
  - over_budget: "Spent {amount} over budget. Review {category} transactions."
  - threshold_80: "At {pct}% of budget. {remaining} left for rest of month."
  - threshold_50: "On track. {remaining} remaining."
  - under_budget: "Under budget by {amount}. Great job!"

### R3: DeltaBadge Reusable Component
- Standalone component usable anywhere (report, dashboard, analytics)
- Props: `value: number`, `invertColor?: boolean` (for expenses where negative = good)
- Renders: colored pill with arrow icon + percentage text

## Architecture

### Backend Changes

**`backend/app/schemas/report.py`** — Extend `BudgetCategoryStatus`:
```python
class BudgetCategoryStatus(BaseModel):
    category: str
    budget_amount: int
    spent: int
    percentage: float
    status: str
    spending_change: Optional[float] = None  # NEW: % change vs prev month
    prev_month_spent: Optional[int] = None   # NEW: previous month spending

class FocusAreaItem(BaseModel):             # NEW
    category: str
    status: str                              # over_budget, threshold_80, etc.
    budget_amount: int
    spent: int
    amount_over_under: int                   # positive = over, negative = under
    percentage: float
    spending_change: Optional[float] = None
    suggestion_key: str                      # i18n key for rule-based suggestion
    suggestion_params: dict                  # interpolation params for i18n

class BudgetAdherence(BaseModel):
    total_budget: int
    total_spent: int
    percentage_used: float
    is_over_budget: bool
    category_status: list[BudgetCategoryStatus]
    focus_areas: list[FocusAreaItem]          # NEW: top 3
```

**`backend/app/services/monthly_report_service.py`** — Add per-category delta calculation:
- In `_get_budget_adherence()`, also fetch prev month spending via `BudgetAlertService.calculate_category_spending(db, user_id, prev_month_key)`
- Calculate `spending_change` per category using `DashboardService._calculate_change(prev, current)`
- Build `focus_areas` list: sort categories by status severity, take top 3
- Compute `amount_over_under` = `spent - budget_amount`
- Set `suggestion_key` based on status string

### Frontend Changes

**New: `frontend/src/components/report/DeltaBadge.tsx`** (~40 lines):
```typescript
interface DeltaBadgeProps {
  value: number | null | undefined
  invertColor?: boolean  // true for expenses (down = green)
  className?: string
}
```
- Renders: `<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ...">+12.5%</span>`
- Green for "good" direction, red for "bad", gray for zero/null

**New: `frontend/src/components/report/FocusAreas.tsx`** (~120 lines):
```typescript
interface FocusAreasProps {
  focusAreas: FocusAreaItem[]
  allCategories: BudgetCategoryStatus[]
}
```
- Shows max 3 focus area cards with status icon, category, amounts, suggestion
- "See all ({count})" button toggles full BudgetAdherenceTable
- Uses `useTranslation` for suggestion text interpolation
- Status icons: CircleAlert (over_budget), TriangleAlert (threshold_80), CircleCheck (under)

**Modify: `frontend/src/pages/MonthlyReport.tsx`**:
- Import FocusAreas instead of BudgetAdherenceTable directly
- Pass `focusAreas` + `allCategories` from `report.budget_adherence`
- FocusAreas internally renders BudgetAdherenceTable when expanded

**Modify: `frontend/src/types/report.ts`**:
- Add `FocusAreaItem` interface
- Add `spending_change`, `prev_month_spent` to `BudgetCategoryStatus`
- Add `focus_areas` to `BudgetAdherence`

## Related Code Files

| File | Action | Lines |
|------|--------|-------|
| `backend/app/schemas/report.py` | Modify | +20 |
| `backend/app/services/monthly_report_service.py` | Modify | +30 |
| `frontend/src/types/report.ts` | Modify | +15 |
| `frontend/src/components/report/DeltaBadge.tsx` | New | ~40 |
| `frontend/src/components/report/FocusAreas.tsx` | New | ~120 |
| `frontend/src/pages/MonthlyReport.tsx` | Modify | ~5 |
| `frontend/src/components/report/BudgetAdherenceTable.tsx` | Keep | 0 (reused inside FocusAreas) |
| `frontend/public/locales/en/common.json` | Modify | +10 keys |
| `frontend/public/locales/ja/common.json` | Modify | +10 keys |
| `frontend/public/locales/vi/common.json` | Modify | +10 keys |

## Implementation Steps

### Backend (Day 1)

- [ ] 1. Add `spending_change`, `prev_month_spent` fields to `BudgetCategoryStatus` in `report.py`
- [ ] 2. Add `FocusAreaItem` schema to `report.py`
- [ ] 3. Add `focus_areas` field to `BudgetAdherence` schema
- [ ] 4. In `monthly_report_service._get_budget_adherence()`:
  - Compute `prev_month_key` from `month_key`
  - Call `BudgetAlertService.calculate_category_spending(db, user_id, prev_month_key)`
  - For each category, compute `spending_change` using `DashboardService._calculate_change()`
  - Build `focus_areas` list sorted by status severity, capped at 3
- [ ] 5. Write unit tests for focus area ranking and delta calculation

### Frontend (Day 2-3)

- [ ] 6. Add `FocusAreaItem` type and updated fields to `frontend/src/types/report.ts`
- [ ] 7. Create `DeltaBadge.tsx` — reusable colored badge component
- [ ] 8. Create `FocusAreas.tsx` — top 3 focus + expandable full table
- [ ] 9. Update `MonthlyReport.tsx` — swap BudgetAdherenceTable for FocusAreas
- [ ] 10. Update `BudgetAdherenceTable.tsx` — add DeltaBadge per category row
- [ ] 11. Add i18n keys for focus area suggestions in en/ja/vi
- [ ] 12. Manual testing on mobile (320px) and desktop

## Success Criteria

1. Report shows colored delta badges on all summary metrics and per-category rows
2. Focus areas section shows max 3 items sorted by severity
3. "See all" expands to show full category table
4. Each focus area has a contextual, rule-based suggestion
5. All text translated in en, ja, vi
6. No file exceeds 200 lines
7. No TypeScript `any` types introduced

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| No budget data for month | Low | Medium | FocusAreas renders empty state gracefully |
| No previous month data for delta | Low | High (first month) | Show "New" badge instead of percentage |
| Performance: extra DB query for prev month | Low | Low | Single aggregate query, indexed on month_key |

## Security Considerations

- No new endpoints exposed; data flows through existing authenticated route
- Per-category spending is already filtered by `user_id` in `BudgetAlertService`
- No user input is rendered unescaped (React handles XSS by default)

## Next Steps

After Phase 1, proceed to [Phase 2: AI Smart Summary](./phase-02-ai-smart-summary.md).
Focus area data from Phase 1 will feed into the AI prompt context for Phase 2.
