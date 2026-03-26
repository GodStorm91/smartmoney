# Phase 2B: Measurement Review & Expansion

**Status:** BLOCKED by Phase 2A + calendar gate | **Est:** 16h (if validated)
**Trigger:** 20 surfaced actions OR 60 days after Phase 2A ships (whichever first)
**ADR Sections:** 7.2-7.4 (metrics, rubric, gates), 4 Phase 2-3

---

## Context

- [Parent plan](./plan.md) | [ADR](../../docs/decisions/260326-ai-smart-actions-strategy.md) Section 7
- Phase 2A must ship first (instrumentation needed for measurement)
- This phase is a **decision point**, not just implementation

## Overview

Run the 30-day review, apply decision gates, then either expand, refine, or archive. Only implement expansion code if gates pass.

## Key Insights

- N=1 means quantitative metrics are noisy — qualitative rubric carries equal weight
- 20 actions at 1/week = ~5 months. Calendar cap at 60 days prevents indefinite wait.
- If daily job generates ~1 action/day but only surfaces 1/week, we'll have ~60 generated but only ~8-9 surfaced in 60 days. Threshold may need adjustment.
- "Persistence" metric (did budget/goal survive 30d?) requires manual check or simple query

## Requirements

### Part 1: Measurement Review (manual + scripted)

1. Run `GET /api/actions/stats` to collect quantitative data
2. Query specifics:
   ```sql
   -- Tap-through rate
   SELECT
     COUNT(*) FILTER (WHERE status = 'executed') as executed,
     COUNT(*) FILTER (WHERE surfaced_at IS NOT NULL) as surfaced,
     COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed,
     COUNT(*) FILTER (WHERE status = 'expired') as expired,
     COUNT(*) FILTER (WHERE status = 'undone') as undone
   FROM pending_actions WHERE user_id = ?;
   ```
3. Check persistence: are budgets/goals created by actions still active?
4. Complete qualitative rubric (5 questions, self-rated)
5. Apply decision gate matrix

### Part 2: Decision Gate (ADR 7.4)

| Quant | Qual | Action |
|---|---|---|
| ✓ (≥20% tap OR ≥3/mo, ≥50% exec) | ✓ (≥3/5 Yes, no Q4 Yes) | **→ Expand** (Part 3) |
| ✓ | ✗ | → Invest in data visualization instead. Archive expansion. |
| ✗ | ✓ | → Refine copy/timing, re-test 30 days |
| ✗ | ✗ | → Archive feature entirely |

### Part 3: Expansion (only if gate passes) ~16h

#### 3a. Goals Page Action Surface (~4h)

**New file:** `frontend/src/components/goals/GoalsInlineAction.tsx`
- Copy BudgetInlineAction pattern (border-l-4 inline bar)
- Surface: `goals_page` (add to ActionType surface union)
- Show for `review_goal_catch_up` actions
- Wire into Goals.tsx

**Backend:** Add `goals_page` to surface enum. Update `generate_review_goal_catch_up` to set `surface="goals_page"` instead of `"dashboard"`.

#### 3b. Monthly Report Action Surface (~4h)

**New file:** `frontend/src/components/report/ReportInlineAction.tsx`
- Same inline pattern
- Surface: `report_page`
- Show relevant actions when viewing monthly report
- Wire into MonthlyReport.tsx

**Backend:** New generator `generate_report_review` — after monthly report is generated, suggest actions for anomalies found in the report.

#### 3c. "Always Do This" Automation Toggle (~6h)

**Backend:**
- Add `auto_execute` boolean column to `pending_actions` or new `action_preferences` table
- New table preferred: `action_preferences(user_id, action_type, auto_execute BOOL, created_at)`
- In `action_service.generate_actions()`: if auto_execute=True for type, skip surfacing and execute immediately
- Log auto-executed actions with `source="auto"` for audit

**Frontend:**
- Add toggle in DashboardActionCard after successful execution: "Always do this automatically?"
- Settings page section for managing automation preferences
- i18n for toggle labels

#### 3d. New Action Types (research-dependent) (~2h)

Candidates based on Phase 1 learnings:
- `flag_unusual_spending` — detect anomaly spending spikes, suggest review
- `archive_old_goals` — completed/expired goals still active, suggest archive
- `suggest_savings_allocation` — monthly income detected, suggest savings split

Only add if measurement data shows demand.

## Architecture

```
Phase 2A ships → timer starts (60 days or 20 surfaced)
                → measurement review (manual + stats endpoint)
                → decision gate
                → if pass: expand surfaces + automation
```

**New files (expansion only):**
- `frontend/src/components/goals/GoalsInlineAction.tsx`
- `frontend/src/components/report/ReportInlineAction.tsx`
- `backend/alembic/versions/XXXXXX_add_action_preferences.py`
- `backend/app/models/action_preference.py`

**Modified files (expansion only):**
- `frontend/src/pages/Goals.tsx` — add GoalsInlineAction
- `frontend/src/pages/MonthlyReport.tsx` — add ReportInlineAction
- `backend/app/services/action_service.py` — auto-execute logic
- `backend/app/services/action_generators.py` — new surface values
- `frontend/src/types/pending-action.ts` — add surface types

## Related Code Files

- `backend/app/services/action_service.py` — core service to extend
- `backend/app/routes/actions.py` — stats endpoint (from 2A)
- `frontend/src/components/budget/BudgetInlineAction.tsx` — pattern to copy
- `frontend/src/pages/Goals.tsx` — wire GoalsInlineAction
- `frontend/src/pages/MonthlyReport.tsx` — wire ReportInlineAction

## Todo List

### Measurement (manual)
- [ ] Run stats query after trigger date
- [ ] Calculate tap-through, execution rate, undo rate
- [ ] Check persistence of created budgets/goals
- [ ] Complete 5-question qualitative rubric
- [ ] Document results in `reports/phase-2b-measurement-results.md`
- [ ] Apply decision gate → record outcome

### Expansion (only if gate passes)
- [ ] Create GoalsInlineAction component
- [ ] Wire into Goals.tsx
- [ ] Create ReportInlineAction component
- [ ] Wire into MonthlyReport.tsx
- [ ] Create action_preferences table + model
- [ ] Add auto-execute logic to ActionService
- [ ] Add "Always do this" toggle to DashboardActionCard
- [ ] Update i18n (en/ja/vi)
- [ ] Build verification
- [ ] Deploy

## Success Criteria

**Measurement:**
- Stats collected and documented
- Decision gate applied with clear outcome
- If "refine" → specific copy/timing changes identified

**Expansion (if validated):**
- 4 surfaces active (dashboard, budget, goals, report)
- Auto-execute works for opted-in action types
- No regression in existing action flows
- i18n complete for new surfaces

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Not enough surfaced actions for meaningful data | Medium | 60-day calendar cap ensures review happens regardless |
| Gate says "archive" | Low | Feature cost was minimal (~40h); sunset cleanly |
| Auto-execute causes unwanted mutations | High | Opt-in per type, undo still available, disclaimer shown |
| Scope creep in expansion | Medium | Strict 4-surface + 1-automation cap; no new action types without data |

## Security Considerations

- Auto-execute creates budgets/adjustments without explicit tap — must show "auto-applied" indicator
- Audit trail: all auto-executed actions logged with timestamps
- Undo remains available for 24h even on auto-executed actions

## Next Steps

→ If expansion ships: Phase 3 (automation rules) per ADR — only after expansion proves useful
→ If archived: redirect effort to data visualization improvements
