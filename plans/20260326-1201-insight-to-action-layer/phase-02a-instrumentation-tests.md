# Phase 2A: Instrumentation, Tests & Accuracy Gate

**Status:** NOT STARTED | **Est:** 13h | **Depends on:** Phase 1 (deployed)
**ADR Sections:** 7.1 (event model), 4 (Phase 0 gates)
**Priority:** High — blocks Phase 2B measurement review

---

## Context

- [Parent plan](./plan.md) | [ADR](../../docs/decisions/260326-ai-smart-actions-strategy.md)
- Phase 1 deployed: 4 action types, 2 surfaces, undo, badge, i18n
- Missing: event instrumentation for measurement, backend tests, accuracy scripts

## Overview

Ship the measurement infrastructure so Phase 2B review has real data. Three workstreams: instrumentation, tests, accuracy scripts.

## Key Insights

- Timestamp columns already exist in `pending_actions` (created_at, surfaced_at, executed_at, dismissed_at, undone_at) — most are set correctly. Need to audit completeness.
- `viewed` event from ADR 7.1 is NOT implemented — requires frontend IntersectionObserver. **Defer to Phase 2B** (low value for N=1).
- Stats endpoint is trivial — GROUP BY status on pending_actions.
- Existing test patterns: `backend/tests/test_insight_service.py`, `test_savings_service.py`

## Requirements

1. Verify all state transitions set correct timestamps
2. Add `GET /api/actions/stats` endpoint
3. 23+ backend tests (15 service + 8 routes)
4. 2 standalone accuracy scripts

## Architecture

No new models or schema changes. Add 1 route endpoint. Add 2 test files. Add 2 scripts.

## Related Code Files

- `backend/app/services/action_service.py` — verify timestamp setting
- `backend/app/routes/actions.py` — add stats endpoint
- `backend/tests/test_insight_service.py` — pattern for service tests
- `backend/tests/test_savings_service.py` — pattern for route tests
- `backend/app/models/pending_action.py` — model reference
- `backend/app/database.py` — SessionLocal for scripts

## Implementation Steps

### Step 1: Audit Timestamp Setting (~1h)

Review `action_service.py` and verify each transition sets the right timestamp:

| Transition | Timestamp | Currently Set? |
|---|---|---|
| generate → pending | `created_at` | Yes (model default) |
| pending → surfaced | `surfaced_at` | Yes (surface_actions line 79) |
| surfaced → executed | `executed_at` | Yes (execute_action line 102) |
| surfaced → dismissed | `dismissed_at` | Yes (dismiss_action line 120) |
| pending/surfaced → expired | — | No timestamp column for expired_at, use status change |
| executed → undone | `undone_at` | Yes (undo_action line 143) |

Add logging: `logger.info(f"Action {id} ({type}): {old_status} -> {new_status}")` on every transition.

### Step 2: Stats Endpoint (~1h)

**File:** `backend/app/routes/actions.py` — add to existing router

```python
@router.get("/stats")
def get_action_stats(db, current_user):
    """Return action counts grouped by status + conversion metrics."""
    # COUNT(*) GROUP BY status
    # Calculate: surfaced, executed, dismissed, expired, undone counts
    # Compute: tap_through = executed / surfaced, execution_rate = executed / (executed + dismissed)
    return {
        "by_status": {...},
        "metrics": {
            "total_surfaced": N,
            "tap_through_rate": float,
            "execution_rate": float,
            "undo_rate": float,
        }
    }
```

### Step 3: Backend Service Tests (~6h)

**File:** `backend/tests/test_action_service.py` (~15 tests)

Setup: create test user, seed transactions/budgets/goals in test DB.

| # | Test | What It Verifies |
|---|---|---|
| 1 | `test_generate_review_uncategorized` | >5 "Other" txns → creates action |
| 2 | `test_skip_review_uncategorized_below_threshold` | ≤5 "Other" txns → no action |
| 3 | `test_generate_copy_or_create_budget` | No current month budget → creates action |
| 4 | `test_skip_budget_if_exists` | Budget exists → no action |
| 5 | `test_generate_adjust_budget_category` | Overspent category → creates action |
| 6 | `test_generate_review_goal_catch_up` | Behind-pace goal → creates action |
| 7 | `test_dedup_skips_existing_active` | Same type+user active → no duplicate |
| 8 | `test_dedup_allows_after_expiry` | After expired → new action ok |
| 9 | `test_surface_marks_surfaced` | surface_actions sets surfaced_at |
| 10 | `test_surface_weekly_cap` | Already surfaced this week → respects cap |
| 11 | `test_execute_idempotent` | Double execute → success both times |
| 12 | `test_execute_stores_snapshot` | Budget actions store undo_snapshot |
| 13 | `test_dismiss_sets_cooldown` | Dismiss → 30-day cooldown blocks regen |
| 14 | `test_undo_within_window` | Undo <24h → reverts mutation |
| 15 | `test_undo_expired_window` | Undo >24h → fails |

### Step 4: Backend Route Tests (~3h)

**File:** `backend/tests/test_action_routes.py` (~8 tests)

| # | Test | Endpoint |
|---|---|---|
| 1 | `test_get_pending_empty` | GET /api/actions/pending → empty list |
| 2 | `test_get_pending_with_surface_filter` | GET ?surface=dashboard → filtered |
| 3 | `test_get_count` | GET /api/actions/count → {"count": N} |
| 4 | `test_get_stats` | GET /api/actions/stats → metrics |
| 5 | `test_execute_success` | POST /{id}/execute → 200 |
| 6 | `test_execute_not_found` | POST /999/execute → 404 |
| 7 | `test_dismiss_success` | POST /{id}/dismiss → 200 |
| 8 | `test_undo_success` | POST /{id}/undo → 200 |

### Step 5: Accuracy Scripts (~2h)

**File:** `backend/scripts/spot_check_accuracy.py` (~60 lines)

Interactive CLI: query 50 recent transactions, display each, prompt C/I/S, report accuracy %.

**File:** `backend/scripts/budget_consistency_audit.py` (~50 lines)

Auto: pick 3 random budget categories, compare sum(txns) vs allocation.amount, report match/mismatch.

## Todo List

- [ ] Audit all timestamp setting in action_service.py, add transition logging
- [ ] Add `GET /api/actions/stats` endpoint with conversion metrics
- [ ] Create `backend/tests/test_action_service.py` (15 tests)
- [ ] Create `backend/tests/test_action_routes.py` (8 tests)
- [ ] Create `backend/scripts/spot_check_accuracy.py`
- [ ] Create `backend/scripts/budget_consistency_audit.py`
- [ ] Run `uv run python -m pytest tests/test_action_service.py tests/test_action_routes.py -v` — all pass
- [ ] Run spot-check script, record result in `reports/phase-2a-accuracy-results.md`

## Success Criteria

- All 23+ tests pass
- Stats endpoint returns correct counts matching DB state
- Every state transition logged with timestamp
- Accuracy spot-check completed and documented

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Test DB fixture complexity | Medium | Reuse existing test patterns; minimal seed data |
| Accuracy below 85% | Low | Feature already shipped; spot-check is informational |
| Stats query performance | Low | Single table, indexed by status |

## Next Steps

→ Phase 2B: measurement review after 20 actions or 60 days
