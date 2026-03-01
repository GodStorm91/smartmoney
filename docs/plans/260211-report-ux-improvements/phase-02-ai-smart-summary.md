# Phase 2: AI Smart Summary Card

**Date:** 2026-02-11
**Priority:** P1
**Status:** Planned
**Estimated Effort:** ~3 days
**Depends On:** Phase 1 (focus area data feeds AI prompt)

---

## Context Links

- Master plan: [plan.md](./plan.md)
- Phase 1: [phase-01-delta-badges-focus-areas.md](./phase-01-delta-badges-focus-areas.md)
- Claude AI service: `backend/app/services/claude_ai_service.py` (194 lines)
- Credit service: `backend/app/services/credit_service.py` (258 lines)
- Report routes: `backend/app/routes/reports.py` (328 lines)
- Report schemas: `backend/app/schemas/report.py`

## Overview

Add AI-generated 3-bullet summary card at top of monthly report: one win (green), one warning (amber), one trend (blue). Opt-in via "Generate Summary" button since it costs credits. Cache result in DB.

## Key Insights

- `ClaudeAIService` uses `claude-3-5-haiku-20241022` model, temperature 0.3 for consistency
- Token tracking pattern: `generate_budget_with_tracking()` returns `(result, usage)` tuple
- Credit deduction: `CreditService.deduct_credits(user_id, amount, "usage", ...)` with `InsufficientCreditsError`
- JSON extraction: `find("[")` / `rfind("]")` pattern already used for budget responses
- Haiku model cost ~0.02 credits per call (small prompt + short output)
- Report data is immutable after month ends — perfect caching candidate

## Requirements

### R1: AI Summary Generation Endpoint
- `POST /api/reports/monthly/{year}/{month}/ai-summary`
- Requires authentication (existing `get_current_user`)
- Accepts optional `language` query param (default: "ja")
- Returns cached summary if exists, else generates new one
- Deducts credits on generation (not on cache hit)
- Returns 402 if insufficient credits

### R2: AI Summary Schema
```python
class AIReportSummary(BaseModel):
    year: int
    month: int
    win: str          # Green bullet — something positive
    warning: str      # Amber bullet — something to watch
    trend: str        # Blue bullet — trend observation
    generated_at: datetime
    is_cached: bool
    credits_used: float
```

### R3: AI Summary Cache
- Store in new `report_ai_summaries` table (avoid re-generation costs)
- Unique constraint on `(user_id, year, month, language)`
- Columns: id, user_id, year, month, language, win, warning, trend, credits_used, created_at
- On regeneration request: delete old cache, generate fresh

### R4: Frontend Smart Summary Card
- Positioned at top of report, before summary metrics
- 3 colored bullets: green (win), amber (warning), blue (trend)
- "Generate Summary" button when no cached summary exists
- Loading state during generation
- Error state with retry button
- "Regenerate" button (smaller, secondary) when cached summary shown
- Credit cost indicator next to generate button: "~0.02 credits"
- Graceful fallback: if AI fails or no credits, show rule-based summary from Phase 1 focus areas

### R5: Rule-Based Fallback
- If AI unavailable: derive 3 bullets from report data:
  - Win: lowest spending change category OR highest savings rate
  - Warning: top focus area from Phase 1
  - Trend: net_change direction sentence
- No credits charged for fallback

## Architecture

### Backend

**New: `backend/app/models/report_ai_summary.py`** (~30 lines):
```python
class ReportAISummary(Base):
    __tablename__ = "report_ai_summaries"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    year: Mapped[int]
    month: Mapped[int]
    language: Mapped[str] = mapped_column(String(5), default="ja")
    win: Mapped[str] = mapped_column(Text)
    warning: Mapped[str] = mapped_column(Text)
    trend: Mapped[str] = mapped_column(Text)
    credits_used: Mapped[float] = mapped_column(default=0.0)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", "language"),
    )
```

**New: `backend/app/services/report_ai_service.py`** (~120 lines):
- `generate_report_summary(db, user_id, year, month, language, report_data)` method
- Build prompt with: summary metrics, focus areas, category breakdown, spending trends
- Prompt asks for JSON: `{"win": "...", "warning": "...", "trend": "..."}`
- Parse with `find("{")` / `rfind("}")` pattern
- Deduct credits via CreditService
- Cache result in ReportAISummary table
- Return `AIReportSummary` schema

**Prompt template** (~500 tokens input estimate):
```
You are a financial advisor summarizing a monthly report.
Respond in {language}. Return ONLY a JSON object.

DATA:
- Income: {income} ({income_change}% vs last month)
- Expenses: {expense} ({expense_change}% vs last month)
- Savings rate: {savings_rate}%
- Top overspend: {focus_area_1}
- Budget status: {budget_summary}

Return JSON:
{"win": "one positive insight", "warning": "one concern", "trend": "one trend observation"}

Rules:
- Each field max 80 characters
- Be specific with numbers
- Be actionable
```

**Modify: `backend/app/routes/reports.py`** — Add new endpoint:
```python
@router.post("/monthly/{year}/{month}/ai-summary")
async def generate_ai_summary(
    year: int, month: int,
    language: str = Query("ja"),
    force_regenerate: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
```

**New Alembic migration** for `report_ai_summaries` table.

### Frontend

**New: `frontend/src/components/report/SmartSummaryCard.tsx`** (~130 lines):
```typescript
interface SmartSummaryCardProps {
  year: number
  month: number
  reportData: MonthlyUsageReportData  // for rule-based fallback
}
```
- Uses `useMutation` from TanStack Query for AI generation
- States: empty (show generate button), loading (spinner), success (3 bullets), error (retry)
- On mount, check if cached via GET or attempt POST
- Green/amber/blue bullet colors with icons (CheckCircle, AlertTriangle, TrendingUp)
- Credit cost shown as subtle text: `~0.02 credits`

**Modify: `frontend/src/services/report-service.ts`** — Add:
```typescript
export async function generateAISummary(
  year: number, month: number, language?: string, forceRegenerate?: boolean
): Promise<AIReportSummary> {
  const response = await apiClient.post(
    `/api/reports/monthly/${year}/${month}/ai-summary`,
    null,
    { params: { language, force_regenerate: forceRegenerate } }
  )
  return response.data
}
```

**Modify: `frontend/src/types/report.ts`** — Add:
```typescript
export interface AIReportSummary {
  year: number
  month: number
  win: string
  warning: string
  trend: string
  generated_at: string
  is_cached: boolean
  credits_used: number
}
```

**Modify: `frontend/src/pages/MonthlyReport.tsx`**:
- Add SmartSummaryCard between ReportHeader/MonthPicker and summary metrics
- Pass `year`, `month`, `reportData` as props

## Related Code Files

| File | Action | Lines |
|------|--------|-------|
| `backend/app/models/report_ai_summary.py` | New | ~30 |
| `backend/app/services/report_ai_service.py` | New | ~120 |
| `backend/app/schemas/report.py` | Modify | +15 |
| `backend/app/routes/reports.py` | Modify | +30 |
| `backend/alembic/versions/xxx_add_report_ai_summary.py` | New | ~30 |
| `frontend/src/components/report/SmartSummaryCard.tsx` | New | ~130 |
| `frontend/src/services/report-service.ts` | Modify | +15 |
| `frontend/src/types/report.ts` | Modify | +10 |
| `frontend/src/pages/MonthlyReport.tsx` | Modify | +5 |
| `frontend/public/locales/en/common.json` | Modify | +8 keys |
| `frontend/public/locales/ja/common.json` | Modify | +8 keys |
| `frontend/public/locales/vi/common.json` | Modify | +8 keys |

## Implementation Steps

### Backend (Day 1-2)

- [ ] 1. Create `ReportAISummary` model in `backend/app/models/report_ai_summary.py`
- [ ] 2. Create Alembic migration for `report_ai_summaries` table
- [ ] 3. Add `AIReportSummary` response schema to `backend/app/schemas/report.py`
- [ ] 4. Create `backend/app/services/report_ai_service.py`:
  - `get_cached_summary(db, user_id, year, month, language)` — check cache
  - `generate_report_summary(db, user_id, year, month, language, report_data)` — call AI + cache
  - `_build_summary_prompt(report_data, language)` — construct prompt
  - `_parse_summary_response(text)` — extract JSON
  - `_generate_rule_based_fallback(report_data)` — fallback if AI fails
- [ ] 5. Add `POST /api/reports/monthly/{year}/{month}/ai-summary` to `reports.py`
  - Check cache first; return if exists and not `force_regenerate`
  - Generate report data (reuse `MonthlyReportService.generate_report()`)
  - Call `report_ai_service.generate_report_summary()`
  - Handle `InsufficientCreditsError` with 402 response
  - Handle AI errors with rule-based fallback
- [ ] 6. Write tests for prompt building, response parsing, caching, credit deduction

### Frontend (Day 2-3)

- [ ] 7. Add `AIReportSummary` type to `frontend/src/types/report.ts`
- [ ] 8. Add `generateAISummary()` to `frontend/src/services/report-service.ts`
- [ ] 9. Create `SmartSummaryCard.tsx`:
  - `useMutation` for AI generation
  - Rule-based fallback computation from `reportData`
  - States: empty, loading, cached, error
  - 3 colored bullet layout (responsive, mobile-first)
  - Generate/Regenerate buttons with credit cost
  - Toast on error: `toast.error(t('report.aiSummaryError'))`
- [ ] 10. Update `MonthlyReport.tsx` to include SmartSummaryCard
- [ ] 11. Add i18n keys for all summary card strings in en/ja/vi
- [ ] 12. Test on mobile and desktop

## Success Criteria

1. AI summary generates in under 3 seconds
2. Cached summary loads instantly (no API call to Claude)
3. Credits correctly deducted on generation, not on cache hit
4. Rule-based fallback works when AI fails or no credits
5. 402 error handled gracefully in UI with "insufficient credits" message
6. All text in 3 locales
7. No file exceeds 200 lines

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Claude API timeout | Medium | Low | 10s timeout, rule-based fallback |
| Invalid JSON from Claude | Medium | Low | Try/catch with fallback, temperature 0.3 |
| Credit deduction race condition | High | Very Low | CreditService uses row-level locking |
| Prompt injection via category names | Low | Very Low | Categories are system-defined, not user-input |
| Cache stale if report data changes | Low | Very Low | Month data is immutable once ended; regenerate button available |

## Security Considerations

- New endpoint requires authentication (`get_current_user` dependency)
- Credit deduction is atomic (row-level locking in CreditService)
- AI prompt contains only aggregate financial data, no PII
- Response stored in DB with `user_id` foreign key — properly scoped
- No raw user input passed to AI prompt (categories are system-defined)
- Rate limiting: consider adding per-user rate limit on AI endpoint (1 req/min)

## Next Steps

After Phase 2, proceed to [Phase 3: Dashboard Report Banner](./phase-03-dashboard-report-banner.md).
The AI summary `win` text from Phase 2 will be shown as the banner insight in Phase 3.
