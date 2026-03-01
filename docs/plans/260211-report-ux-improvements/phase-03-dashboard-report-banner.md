# Phase 3: Dashboard Auto-Report Banner

**Date:** 2026-02-11
**Priority:** P2
**Status:** Planned
**Estimated Effort:** ~1 day
**Depends On:** Phase 2 (AI summary text for banner insight; rule-based fallback available)

---

## Context Links

- Master plan: [plan.md](./plan.md)
- Phase 2: [phase-02-ai-smart-summary.md](./phase-02-ai-smart-summary.md)
- Dashboard: `frontend/src/pages/Dashboard.tsx` (376 lines)
- Dashboard alerts: `frontend/src/components/dashboard/DashboardAlerts.tsx`
- Report service: `frontend/src/services/report-service.ts` (30 lines)

## Overview

Show a banner on the Dashboard during the first 7 days of each month prompting users to review their previous month's report. Banner shows a teaser insight and navigates to the report page. Dismissable per month.

## Key Insights

- Dashboard layout has 9 sections; banner goes after alerts (#4 slot)
- Dashboard is 376 lines — close to 200-line limit, so banner must be a separate component
- Banner dismissal via `localStorage` key like `report-banner-dismissed-2026-01`
- Previous month calculation: if today is Feb 3, banner shows for January report
- `useNavigate` from TanStack Router for programmatic navigation to `/reports/monthly`
- AI summary from Phase 2 provides `win` text; if unavailable use rule-based insight

## Requirements

### R1: Banner Visibility Logic
- Show only during days 1-7 of current month
- Show for PREVIOUS month's report (e.g., Feb 1-7 shows Jan report)
- Do NOT show if user has dismissed it (localStorage key per month)
- Do NOT show if no transaction data exists for the previous month

### R2: Banner Content
- Title: "Your {Month} report is ready!"
- Insight teaser: AI summary `win` text if available, else rule-based one-liner
- CTA button: "View Report" navigates to report page with correct year/month
- Dismiss button: X icon, sets localStorage key

### R3: Banner Design
- Full-width card in Dashboard layout
- Gradient background (subtle blue-to-purple or brand green)
- Mobile-first: stacked layout, touch-friendly dismiss and CTA
- Matches existing DashboardAlerts visual pattern
- Animations: slide-in on mount, fade-out on dismiss

### R4: Rule-Based Insight Fallback
- If no AI summary cached: generate rule-based insight from dashboard summary data
- Pattern: "Expenses {decreased/increased} by {X}% in {Month}"
- Uses data already available in Dashboard queries (no extra API call)

## Architecture

### Frontend Only — No Backend Changes

**New: `frontend/src/components/dashboard/ReportBanner.tsx`** (~100 lines):
```typescript
interface ReportBannerProps {
  className?: string
}
```

Internals:
- Compute `prevMonth` / `prevYear` from `new Date()`
- Check `localStorage.getItem(`report-banner-dismissed-${prevYear}-${prevMonth}`)`
- Check `new Date().getDate() <= 7`
- If both conditions pass, render banner
- `useQuery` to fetch AI summary (optional, fire-and-forget):
  ```typescript
  const { data: aiSummary } = useQuery({
    queryKey: ['ai-summary', prevYear, prevMonth],
    queryFn: () => fetchAISummary(prevYear, prevMonth),
    enabled: shouldShow,
    retry: false,
    staleTime: Infinity,
  })
  ```
- Note: `fetchAISummary` is a GET-like call that returns cached summary only (no generation)
- If no AI summary, use rule-based insight from monthlyTrends data passed via prop or fetched inline
- Dismiss handler: `localStorage.setItem(...)` + `setDismissed(true)`
- CTA: `<Link to="/reports/monthly" search={{ year: prevYear, month: prevMonth }}>`

**New: `frontend/src/services/report-service.ts`** — Add fetch-only function:
```typescript
export async function fetchAISummary(
  year: number, month: number
): Promise<AIReportSummary | null> {
  try {
    const response = await apiClient.get(
      `/api/reports/monthly/${year}/${month}/ai-summary`
    )
    return response.data
  } catch {
    return null  // graceful — banner works without AI
  }
}
```

**Backend addition** — Add GET variant of AI summary endpoint:
```python
@router.get("/monthly/{year}/{month}/ai-summary")
async def get_ai_summary(year, month, ...):
    """Return cached AI summary if exists, 404 if not."""
```
This is a small addition (~10 lines) to `backend/app/routes/reports.py`.

**Modify: `frontend/src/pages/Dashboard.tsx`**:
- Import `ReportBanner`
- Add between section #4 (DashboardAlerts) and section #5 (Quick Actions):
  ```tsx
  {/* 4.5 Report Banner (first 7 days of month) */}
  <ReportBanner />
  ```
- This adds ~2 lines to Dashboard.tsx

## Related Code Files

| File | Action | Lines |
|------|--------|-------|
| `frontend/src/components/dashboard/ReportBanner.tsx` | New | ~100 |
| `frontend/src/pages/Dashboard.tsx` | Modify | +2 |
| `frontend/src/services/report-service.ts` | Modify | +15 |
| `backend/app/routes/reports.py` | Modify | +10 (GET ai-summary) |
| `frontend/public/locales/en/common.json` | Modify | +5 keys |
| `frontend/public/locales/ja/common.json` | Modify | +5 keys |
| `frontend/public/locales/vi/common.json` | Modify | +5 keys |

## Implementation Steps

### Backend (1 hour)

- [ ] 1. Add `GET /api/reports/monthly/{year}/{month}/ai-summary` to `reports.py`
  - Query `ReportAISummary` table for cached result
  - Return 404 if no cache exists (banner gracefully handles this)
  - No credit deduction on GET

### Frontend (Day 1)

- [ ] 2. Add `fetchAISummary()` GET function to `report-service.ts`
- [ ] 3. Create `ReportBanner.tsx`:
  - Date logic (first 7 days, previous month calculation)
  - localStorage dismiss logic with month-specific key
  - Conditional `useQuery` for AI summary
  - Rule-based fallback insight text
  - Banner UI: gradient card, insight text, View Report link, dismiss X
  - Responsive layout (mobile-first)
  - Slide-in animation on mount
- [ ] 4. Add `<ReportBanner />` to `Dashboard.tsx` after DashboardAlerts
- [ ] 5. Add i18n keys:
  - `report.bannerTitle`: "Your {month} report is ready!"
  - `report.bannerCta`: "View Report"
  - `report.bannerFallback`: "Expenses {direction} by {change}% in {month}"
  - `report.bannerDismissLabel`: "Dismiss" (aria-label)
- [ ] 6. Test:
  - Verify banner shows only days 1-7
  - Verify dismiss persists across page reloads
  - Verify correct month/year in report link
  - Verify fallback insight when no AI summary
  - Test mobile layout (320px)

## Success Criteria

1. Banner appears on Dashboard only during days 1-7 of current month
2. Banner shows previous month's report insight
3. Dismiss persists via localStorage (does not reappear after refresh)
4. "View Report" navigates to correct month's report page
5. Works without AI summary (rule-based fallback)
6. Mobile-first responsive layout
7. All text in 3 locales
8. Dashboard.tsx stays under 200 lines (adds only ~2 lines)
9. ReportBanner.tsx under 100 lines

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Banner annoys users | Low | Low | Dismissable + only 7 days/month |
| localStorage cleared | Low | Low | Banner re-appears; not harmful |
| No data for prev month | Low | Medium | Banner checks data existence before rendering |
| AI summary GET fails | None | Low | Graceful fallback to rule-based insight |
| Dashboard too long | Low | Low | Banner is self-contained component, adds 2 lines to Dashboard |

## Security Considerations

- localStorage stores only a dismiss flag string (no sensitive data)
- GET ai-summary endpoint is read-only, no credit impact
- Banner navigates via client-side routing — no open redirect risk
- No user input rendered in banner (all text from i18n or API)

## Next Steps

Phase 3 completes the Report UX Improvements initiative. Post-launch:
- Monitor banner dismiss rate to calibrate display duration (7 days may be too long)
- Consider A/B testing banner position (before vs after alerts)
- Future: push notification for report readiness (requires notification infrastructure)
