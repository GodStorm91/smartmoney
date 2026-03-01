# Backend API Audit: Validation Errors & Empty States

**Date:** 2026-02-10
**Status:** Complete
**Scope:** All route files, schemas, services, error handlers

---

## 1. Validation Error Response Audit

### Global Error Handlers (`backend/app/main.py`)

**Issues Found & Fixed:**

| Issue | Before | After |
|-------|--------|-------|
| Duplicate imports | `logging` and `RequestValidationError` imported twice | Removed duplicates |
| Validation error format | `{"detail": "Validation error", "errors": [...raw pydantic...]}` | `{"detail": [{"field": "name", "message": "...", "type": "..."}]}` - frontend can map to form fields |
| SQLAlchemy errors leak DB details | `{"error": str(exc)}` always included | Only exposed in debug mode |
| General errors leak internals | `{"error": str(exc)}` always included | Only exposed in debug mode; uses error code `INTERNAL_SERVER_ERROR` |

**New 422 Response Format:**
```json
{
  "detail": [
    { "field": "monthly_income", "message": "Input should be greater than 0", "type": "greater_than" },
    { "field": "language", "message": "String should match pattern '^(ja|en|vi)$'", "type": "string_pattern_mismatch" }
  ]
}
```

Frontend can now map `field` directly to form field names for inline validation display.

### Route-Level Error Handling

All routes reviewed. Error patterns observed:

- **Consistent 404s:** All single-resource GETs raise `HTTPException(404, detail="X not found")` -- consistent
- **400 for business logic:** Duplicate checks, invalid state transitions use 400 -- consistent
- **402 for credits:** Budget generation endpoints properly use 402 for insufficient credits
- **Generic exception catching:** Several routes (`transactions`, `goals`, `accounts`) catch `Exception` and return 400 with `str(e)` -- acceptable for user-facing creation errors, avoids 500s

**No changes needed** at route level -- patterns are consistent.

---

## 2. Empty State Response Audit

### List Endpoints -- All Return `[]` Correctly

| Endpoint | Response Type | Empty Behavior | Status |
|----------|--------------|----------------|--------|
| `GET /api/transactions/` | `TransactionListResponse` | `{"transactions": [], "total": 0, ...}` | OK |
| `GET /api/goals/` | `list[GoalResponse]` | `[]` | OK |
| `GET /api/accounts/` | `list[AccountWithBalanceResponse]` | `[]` | OK |
| `GET /api/analytics` | `AnalyticsResponse` | `{"monthly_trends": [], "category_breakdown": [], "total_income": 0, ...}` | OK |
| `GET /api/analytics/monthly` | `list[MonthlyCashflowResponse]` | `[]` | OK |
| `GET /api/analytics/categories` | `list[CategoryBreakdownResponse]` | `[]` | OK |
| `GET /api/analytics/trend` | `list[MonthlyCashflowResponse]` | `[]` | OK |
| `GET /api/analytics/sources` | `list[SourceBreakdownResponse]` | `[]` | OK |
| `GET /api/analytics/insights` | `SpendingInsightsResponse` | `{"insights": [], ...}` | OK |
| `GET /api/budgets/history` | `list[BudgetResponse]` | `[]` | OK |
| `GET /api/budgets/{month}/versions` | `list[BudgetVersionResponse]` | `[]` | OK |
| `GET /api/recurring/` | `RecurringTransactionListResponse` | `{"recurring_transactions": [], "total": 0}` | OK |
| `GET /api/recurring/suggestions` | `RecurringSuggestionsResponse` | `{"suggestions": [], "total": 0}` | OK |
| `GET /api/bills` | `BillListResponse` | `{"bills": [], "total_count": 0}` | OK |
| `GET /api/bills/upcoming` | `UpcomingBillsResponse` | `{"upcoming_bills": [], "total_count": 0, "total_amount": 0}` | OK |
| `GET /api/tags/` | `list[TagResponse]` | `[]` | OK |
| `GET /api/categories` | `CategoryTreeResponse` | `{"expense": [], "income": []}` | OK |
| `GET /api/categories/` | `list[UserCategoryResponse]` | `[]` | OK |
| `GET /api/transfers/` | `list[TransferListItem]` | `[]` | OK |
| `GET /api/anomalies` | `list[AnomalyAlertResponse]` | `[]` | OK |
| `GET /api/insights` | `list[InsightCardResponse]` | `[]` | OK |
| `GET /api/notifications` | `list[NotificationResponse]` | `[]` | OK |
| `GET /api/savings/recommendations` | `list[SavingsRecommendationResponse]` | `[]` | OK |
| `GET /api/challenges/available` | `list[ChallengeResponse]` | `[]` | OK |
| `GET /api/challenges/my-challenges` | `list[UserChallengeResponse]` | `[]` | OK |

**No null returns found.** All list endpoints return empty arrays.

### Summary/Aggregate Endpoints -- Zero-Data Handling

| Endpoint | Zero-Data Behavior | Status |
|----------|-------------------|--------|
| `GET /api/dashboard/summary` | Returns `{"income": 0, "expense": 0, "net": 0, "income_change": 0.0, ...}` | OK |
| `GET /api/transactions/summary/total` | Returns `{"income": 0, "expenses": 0, "net": 0, "count": 0}` | OK |
| `GET /api/budgets/suggestions` | Returns `{"has_previous": false, ...}` with null fields | OK |
| `GET /api/gamification/stats` | Returns zeroed stats object | OK |
| `GET /api/anomalies/unread/count` | Returns `{"count": 0}` | OK |
| `GET /api/insights/unread/count` | Returns `{"count": 0}` | OK |
| `GET /api/notifications/unread/count` | Returns `{"count": 0}` | OK |
| `GET /api/savings/unread/count` | Returns `{"count": 0}` | OK |

**No errors on zero-data.** Dashboard summary correctly returns zeros and 0.0% changes.

---

## 3. Schema Improvements

### Field Descriptions Added

| Schema File | Fields Updated |
|-------------|---------------|
| `schemas/dashboard.py` | All 6 fields: income, expense, net, income_change, expense_change, net_change |
| `schemas/analytics.py` | All fields across SpendingInsight, SpendingInsightsResponse, MonthlyCashflowResponse, CategoryBreakdownResponse, SourceBreakdownResponse, AnalyticsResponse |
| `schemas/budget.py` | BudgetAllocationSchema (category, amount, reasoning), BudgetGenerateRequest (monthly_income, feedback, language), BudgetRegenerateRequest (feedback, language), AllocationUpdateRequest (amount) |
| `schemas/transaction.py` | TransactionSummaryResponse (income, expenses, net, count) |

**Already well-documented schemas (no changes needed):**
- `schemas/account.py` -- all fields have Field descriptions
- `schemas/goal.py` -- all fields have Field descriptions
- `schemas/recurring.py` -- all fields have Field descriptions
- `schemas/bill.py` -- all fields have Field descriptions/validators
- `schemas/transfer.py` -- all fields have Field descriptions

---

## 4. Files Changed

| File | Change |
|------|--------|
| `backend/app/main.py` | Fixed duplicate imports; improved validation error format for frontend field mapping; hide internal error details in production |
| `backend/app/schemas/dashboard.py` | Added Field descriptions with defaults |
| `backend/app/schemas/analytics.py` | Added Field descriptions with default_factory for lists |
| `backend/app/schemas/budget.py` | Added Field descriptions to request/allocation schemas |
| `backend/app/schemas/transaction.py` | Added Field descriptions to TransactionSummaryResponse |

## 5. Test Results

- **65 passed, 44 failed** (pre-existing failures in test_goal_service, test_models, test_transaction_service -- unchanged)
- No new test failures introduced by these changes
