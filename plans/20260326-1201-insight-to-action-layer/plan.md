# Insight-to-Action Layer - Implementation Plan

**Date:** 2026-03-26 | **ADR:** `docs/decisions/260326-ai-smart-actions-strategy.md`
**Effort:** ~40h total (Phase 0: 2h, Phase 1A: 14h, Phase 1B: 12h, Phase 1C: 12h)

---

## Phases

| # | Phase | Status | Est. | Plan |
|---|-------|--------|------|------|
| 0 | Data Accuracy Gate | DEFERRED (run post-deploy) | 2h | [phase-00-data-accuracy-gate.md](./phase-00-data-accuracy-gate.md) |
| 1A | Backend: Action Queue | DONE | 14h | [phase-01a-backend-action-queue.md](./phase-01a-backend-action-queue.md) |
| 1B | Frontend: Action UI | DONE | 12h | [phase-01b-frontend-action-ui.md](./phase-01b-frontend-action-ui.md) |
| 1C | Integration + Tests | PARTIAL (undo toast + badge done, tests deferred) | 12h | [phase-01c-integration-tests.md](./phase-01c-integration-tests.md) |

**Gate rule:** Phase 0 must pass (>=85% categorization, >=98% budget consistency) before any Phase 1 work begins.

## Architecture Summary

```
Daily Job (2 AM) → pending_actions table → 2 surfaces (Dashboard card, Budget inline)
                                         → ActionService.execute() → reuse existing flows
```

- 4 action types: `review_uncategorized`, `copy_or_create_budget`, `adjust_budget_category`, `review_goal_catch_up`
- State machine: pending -> surfaced -> executed/dismissed/expired -> [undone]
- Dedup: max 1 active per (user_id, type). Dismiss cooldown 30 days. Expire after 7 days.
- Surfacing: 1/week max on dashboard load

## Files Created (new)

**Backend (7 files):**
1. `backend/app/models/pending_action.py` - SQLAlchemy model
2. `backend/app/schemas/pending_action.py` - Pydantic schemas
3. `backend/app/services/action_service.py` - Core ActionService
4. `backend/app/services/action_generation_job.py` - Daily analysis job
5. `backend/app/routes/actions.py` - REST API endpoints
6. `backend/alembic/versions/20260326_add_pending_actions_table.py` - Migration
7. `backend/scripts/spot_check_accuracy.py` - Phase 0 spot-check script

**Frontend (5 files):**
1. `frontend/src/types/pending-action.ts` - TypeScript interfaces
2. `frontend/src/services/pending-action-service.ts` - API client
3. `frontend/src/hooks/use-pending-actions.ts` - React Query hook
4. `frontend/src/components/dashboard/DashboardActionCard.tsx` - Dashboard card
5. `frontend/src/components/budget/BudgetInlineAction.tsx` - Budget inline

## Files Modified

1. `backend/app/main.py` - Register scheduler job + include router
2. `backend/app/models/user.py` - Add relationship to PendingAction
3. `frontend/src/pages/Dashboard.tsx` - Add DashboardActionCard
4. `frontend/src/pages/Budget.tsx` - Add BudgetInlineAction
5. `frontend/src/components/layout/BottomNavigation.tsx` - Badge count
6. `frontend/src/types/index.ts` - Export new types
7. `frontend/public/locales/en/common.json` - i18n keys
8. `frontend/public/locales/ja/common.json` - i18n keys
9. `frontend/public/locales/vi/common.json` - i18n keys

## Key Decisions

- Follow InsightCard + SavingsRecommendation model pattern (JSONB data, status enum, timestamps)
- Follow insights.py route pattern (get_current_user dependency, service instantiation)
- Follow scheduled job pattern in main.py (def + try/except/finally + scheduler.add_job)
- Card temperature: warm for dashboard action card, cool not used
- Undo: sonner toast with 10s window, backend supports 24h undo via undo_snapshot
- Disclaimer on all action cards: "Based on your transaction history. Not financial advice."
