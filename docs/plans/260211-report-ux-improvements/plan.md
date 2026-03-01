# Report UX Improvements — Master Plan

**Date:** 2026-02-11
**Goal:** Make monthly reports actionable, scannable, and proactive. Mobile-first.
**Status:** Planning

---

## Problem Statement

Monthly report is hard to interpret — too verbose, no highlighting, no actionable guidance.
Users need to quickly understand what changed and what to do about it.

## Phases

| # | Phase | Priority | Status | Effort | Details |
|---|-------|----------|--------|--------|---------|
| 1 | Delta Badges + Top 3 Focus Areas | P0 | Planned | ~3 days | [phase-01](./phase-01-delta-badges-focus-areas.md) |
| 2 | AI Smart Summary Card | P1 | Planned | ~3 days | [phase-02](./phase-02-ai-smart-summary.md) |
| 3 | Dashboard Auto-Report Banner | P2 | Planned | ~1 day | [phase-03](./phase-03-dashboard-report-banner.md) |

## Architecture Summary

```
Phase 1 (pure data):
  Backend:  per-category deltas + focus area ranking logic
  Frontend: DeltaBadge component, FocusAreas component, refactored BudgetAdherenceTable

Phase 2 (AI):
  Backend:  new endpoint POST /api/reports/monthly/{year}/{month}/ai-summary
            ClaudeAIService.generate_report_summary() + DB cache
  Frontend: SmartSummaryCard component (opt-in button, 3 colored bullets)

Phase 3 (proactive):
  Frontend: ReportBanner on Dashboard (first 7 days of month)
            localStorage dismissal, navigates to report
```

## Key Constraints

- Files must stay under 200 lines
- i18n: en, ja, vi for all user-facing strings
- No `any` in TypeScript
- Use `apiClient` for API calls, `toast` from `sonner` for notifications
- Credit deduction must follow existing CreditService pattern
- Mobile-first (320px default breakpoint)

## Dependencies

- Phase 2 depends on Phase 1 (focus area data feeds AI prompt context)
- Phase 3 depends on Phase 2 (AI summary text shown in banner, with rule-based fallback)
- All phases are independently deployable with graceful degradation

## Success Criteria

1. Report page loads in under 500ms (no regression)
2. Above-the-fold content on mobile shows summary + focus areas (no scroll for key info)
3. AI summary generation under 3 seconds
4. All 3 locales have complete translations
5. Zero new TypeScript `any` types

## Unresolved Questions

1. Should per-category delta badges compare to previous month or rolling 3-month average?
   Recommendation: previous month (simpler, matches existing MoM pattern).
2. Should AI summary cache expire after a period or persist indefinitely?
   Recommendation: persist indefinitely per month — data is immutable once month ends.
