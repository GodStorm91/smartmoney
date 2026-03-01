# Phase 1: Backend API for Historical Data

**Task:** 3.10
**Story Points:** 3
**Priority:** HIGH
**Status:** Pending

---

## Context Links

- [Main Plan](./plan.md)
- [Original Specs](../20260125-0355-budget-ui-phase3/phase3-followup-plan.md)

---

## Overview

New endpoint for daily spending history needed for accurate predictions. Frontend `spending-prediction.ts` already has interface; backend endpoint missing.

---

## Key Insights

1. Existing `BudgetTrackingService` has category hierarchy logic - reuse it
2. Multi-currency conversion already exists via `convert_to_jpy()`
3. SQLAlchemy GROUP BY for daily aggregation
4. Frontend types `DailySpending` and `CategoryHistory` already defined

---

## Requirements

### Functional
- GET endpoint returning daily spending per category
- Support for N months lookback (1-12, default 3)
- Monthly totals with average daily calculation
- Standard deviation for anomaly threshold
- Multi-currency conversion to JPY

### Non-Functional
- Response time <200ms for 3 months data
- Cache response for 5 minutes (SWR pattern)

---

## Architecture

```
GET /api/budgets/history/{category}?months=3
        |
        v
+-------------------+
| BudgetTrackingService |
| .get_category_history() |
+-------------------+
        |
        v
+-------------------+
| Transaction table |
| GROUP BY DATE(date) |
+-------------------+
        |
        v
+-------------------+
| Response Schema   |
| DailySpending[]   |
| MonthlyTotal[]    |
+-------------------+
```

---

## Related Code Files

| File | Purpose |
|------|---------|
| `backend/app/routes/budgets.py` | Add new endpoint |
| `backend/app/schemas/budget.py` | Add response schemas |
| `backend/app/services/budget_tracking_service.py` | Reuse category hierarchy |
| `frontend/src/utils/spending-prediction.ts` | Existing types |
| `frontend/src/services/budget-service.ts` | Add service function |

---

## Implementation Steps

### Step 1: Add Response Schemas (budget.py)

```python
class DailySpendingSchema(BaseModel):
    date: str  # YYYY-MM-DD
    amount: int  # JPY
    transaction_count: int

class MonthlyTotalSchema(BaseModel):
    month: str  # YYYY-MM
    total: int
    avg_daily: int
    transaction_count: int

class CategoryHistoryResponse(BaseModel):
    category: str
    daily_spending: list[DailySpendingSchema]
    monthly_totals: list[MonthlyTotalSchema]
    overall_avg_daily: float
    std_deviation: float
```

### Step 2: Add Service Method (budget_tracking_service.py)

```python
@staticmethod
def get_category_history(
    db: Session,
    user_id: int,
    category: str,
    months: int = 3
) -> dict | None:
    """Get daily spending history for a category.

    Steps:
    1. Calculate date range (today - N months)
    2. Build category hierarchy (parent + children)
    3. Query daily spending with GROUP BY DATE(date)
    4. Convert all amounts to JPY
    5. Calculate monthly totals + averages
    6. Calculate overall average and std deviation
    """
```

### Step 3: Add Route Endpoint (budgets.py)

```python
@router.get("/history/{category}", response_model=CategoryHistoryResponse)
def get_category_spending_history(
    category: str,
    months: int = Query(default=3, ge=1, le=12),
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> CategoryHistoryResponse:
    """Get daily spending history for ML-lite predictions."""
```

### Step 4: Add Frontend Service Function

```typescript
// budget-service.ts
export async function getCategoryHistory(
  category: string,
  months: number = 3
): Promise<CategoryHistory> {
  const res = await api.get(`/budgets/history/${encodeURIComponent(category)}`, {
    params: { months }
  })
  return res.data
}
```

### Step 5: Update spending-prediction.ts

- Modify `predictCategorySpending()` to use historical data
- Improve anomaly detection threshold using actual std deviation

---

## SQL Query Reference

```sql
-- Daily spending (last N months)
SELECT
    DATE(date) as spend_date,
    SUM(ABS(amount)) as daily_total,
    COUNT(*) as tx_count
FROM transactions
WHERE user_id = :user_id
  AND category IN (:categories)  -- parent + children
  AND is_income = false
  AND is_transfer = false
  AND is_adjustment = false
  AND date >= :start_date
GROUP BY DATE(date)
ORDER BY spend_date DESC;
```

---

## Todo List

- [ ] Add `DailySpendingSchema` to budget.py
- [ ] Add `MonthlyTotalSchema` to budget.py
- [ ] Add `CategoryHistoryResponse` to budget.py
- [ ] Add `get_category_history()` to BudgetTrackingService
- [ ] Add GET endpoint `/history/{category}` to budgets.py
- [ ] Add `getCategoryHistory()` to budget-service.ts
- [ ] Update `predictCategorySpending()` to use history
- [ ] Add database index if needed (user_id, category, date)

---

## Success Criteria

- [ ] Endpoint returns daily spending for last N months
- [ ] Monthly totals include average daily calculation
- [ ] Standard deviation calculated for anomaly threshold
- [ ] Multi-currency transactions converted to JPY
- [ ] Response time <200ms for 3 months data

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Query performance | LOW | MEDIUM | Add composite index |
| Many API calls | LOW | LOW | Batch fetch all categories |

---

## Security Considerations

- User can only access their own transaction history
- Category name validated against user's categories
- Rate limiting (existing middleware)

---

## Next Steps

After completion, proceed to [Phase 2: Keyboard Navigation](./phase-02-keyboard-nav.md)
