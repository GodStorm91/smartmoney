# Cash Flow Forecast Feature - Brainstorm Summary

**Created:** 2026-01-07
**Status:** ✅ Implemented
**Category:** Quick Win - Advanced Analytics

---

## Problem Statement

Users currently see only single-month budget projections. They lack visibility into:
- Where their finances are heading over the next several months
- How recurring bills will impact future balances
- Whether they're on track to meet savings goals

---

## Agreed Solution

**Multi-Month Cash Flow Forecast** displayed on Dashboard with:
- 2 actual historical months + 6 projected months (8 total)
- Recurring-aware algorithm (not simple average)
- All accounts combined
- Variable expense based on 3-month average

---

## Technical Specification

### Backend: New Endpoint

```
GET /api/analytics/forecast?months=6
```

**Response Schema:**
```json
{
  "current_balance": 1500000,
  "months": [
    {
      "month": "2025-12",
      "income": 350000,
      "expense": 280000,
      "net": 70000,
      "balance": 1430000,
      "is_actual": true
    },
    {
      "month": "2026-01",
      "income": 350000,
      "expense": 290000,
      "net": 60000,
      "balance": 1490000,
      "is_actual": true
    },
    {
      "month": "2026-02",
      "income": 350000,
      "expense": 280000,
      "net": 70000,
      "balance": 1560000,
      "is_actual": false,
      "recurring_income": 350000,
      "recurring_expense": 180000,
      "variable_expense": 100000
    }
    // ... 5 more projected months
  ],
  "summary": {
    "avg_monthly_net": 65000,
    "end_balance": 1890000,
    "months_until_negative": null,
    "total_projected_income": 2100000,
    "total_projected_expense": 1710000
  }
}
```

### Backend: ForecastService

**File:** `backend/app/services/forecast_service.py`

```python
class ForecastService:
    @staticmethod
    def get_cashflow_forecast(db: Session, user_id: int, months: int = 6) -> dict:
        """
        Generate multi-month cash flow forecast.

        Algorithm:
        1. Get current total balance (all accounts)
        2. Get last 2 months actual data
        3. Calculate average variable spending (last 3 months)
        4. For each future month:
           - Sum recurring income scheduled for that month
           - Sum recurring expense scheduled for that month
           - Add average variable expense
           - Calculate net and running balance
        """
        pass

    @staticmethod
    def _get_recurring_for_month(db: Session, user_id: int, year: int, month: int) -> tuple[int, int]:
        """Get (total_income, total_expense) from recurring transactions for a specific month."""
        pass

    @staticmethod
    def _calculate_avg_variable_expense(db: Session, user_id: int, lookback_months: int = 3) -> int:
        """
        Calculate average variable (non-recurring) expense.
        Variable = Total Expense - Recurring Expense
        """
        pass
```

### Backend: API Route

**File:** `backend/app/routes/analytics.py` (add to existing)

```python
@router.get("/forecast")
async def get_forecast(
    months: int = Query(default=6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ForecastResponse:
    return ForecastService.get_cashflow_forecast(db, current_user.id, months)
```

### Frontend: New Component

**File:** `frontend/src/components/dashboard/CashFlowForecastCard.tsx`

```tsx
interface ForecastMonth {
  month: string
  income: number
  expense: number
  net: number
  balance: number
  is_actual: boolean
}

interface ForecastData {
  current_balance: number
  months: ForecastMonth[]
  summary: {
    avg_monthly_net: number
    end_balance: number
    months_until_negative: number | null
  }
}

export function CashFlowForecastCard() {
  // Fetch from /api/analytics/forecast
  // Render ComposedChart with:
  //   - Bar chart for income/expense per month
  //   - Line chart overlay for balance
  //   - Visual distinction between actual vs projected
}
```

### Frontend: Chart Design

```
┌──────────────────────────────────────────────────────────────┐
│  📈 6-Month Cash Flow Forecast                               │
├──────────────────────────────────────────────────────────────┤
│                                            ¥1.89M            │
│  Balance                              ╭────────●             │
│  ¥1.5M ─────●────●────────────────────╯                      │
│            ╱                                                 │
│           ●                                                  │
│                                                              │
│     ▓▓▓   ▓▓▓ │ ░░░   ░░░   ░░░   ░░░   ░░░   ░░░          │
│     ███   ███ │ ▒▒▒   ▒▒▒   ▒▒▒   ▒▒▒   ▒▒▒   ▒▒▒          │
│   ──────────────────────────────────────────────────         │
│     Dec   Jan │ Feb   Mar   Apr   May   Jun   Jul           │
│     ▓ Actual    ░ Projected                                  │
│     █ Expense   ▒ Income     ─● Balance                      │
├──────────────────────────────────────────────────────────────┤
│  Projected balance in Jul: ¥1,890,000 (+¥390,000)            │
│  Avg monthly savings: ¥65,000                                │
└──────────────────────────────────────────────────────────────┘
```

### Frontend: Dashboard Integration

**File:** `frontend/src/pages/Dashboard.tsx`

Add after Smart Alerts section:
```tsx
{/* Cash Flow Forecast */}
<div className="mb-6">
  <CashFlowForecastCard />
</div>
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No accounts | Show empty state with CTA |
| No recurring transactions | Use only average expense (warning note) |
| <3 months history | Use available data, show disclaimer |
| Negative balance projected | Highlight in red, show warning |
| All income, no expense | Show but note "No expense history" |

---

## i18n Keys Required

```json
{
  "forecast.title": "6-Month Cash Flow Forecast",
  "forecast.projectedBalance": "Projected balance in {{month}}",
  "forecast.avgMonthlySavings": "Avg monthly savings",
  "forecast.actual": "Actual",
  "forecast.projected": "Projected",
  "forecast.income": "Income",
  "forecast.expense": "Expense",
  "forecast.balance": "Balance",
  "forecast.warning.negative": "Balance may go negative in {{month}}",
  "forecast.warning.noHistory": "Limited history - projection may be less accurate",
  "forecast.empty.title": "No forecast available",
  "forecast.empty.description": "Add transactions to see your cash flow forecast"
}
```

---

## File Changes Summary

### New Files
- `backend/app/services/forecast_service.py`
- `backend/app/schemas/forecast.py`
- `frontend/src/components/dashboard/CashFlowForecastCard.tsx`
- `frontend/src/services/forecast-service.ts`

### Modified Files
- `backend/app/routes/analytics.py` - Add forecast endpoint
- `frontend/src/pages/Dashboard.tsx` - Add ForecastCard
- `frontend/public/locales/*/common.json` - Add i18n keys

---

## Implementation Order

1. **Backend: Schema** - Define Pydantic models
2. **Backend: ForecastService** - Core algorithm
3. **Backend: Route** - API endpoint
4. **Frontend: Service** - API client
5. **Frontend: Component** - ForecastCard with chart
6. **Frontend: Integration** - Add to Dashboard
7. **i18n** - Add translations
8. **Testing** - Manual verification

---

## Estimated Effort

| Task | Time |
|------|------|
| Backend schema + service | 2h |
| Backend route | 30m |
| Frontend service + types | 30m |
| Frontend component | 2h |
| Dashboard integration | 30m |
| i18n translations | 30m |
| Testing & polish | 1h |
| **Total** | **~7 hours** |

---

## Success Criteria

- [ ] Forecast displays 2 actual + 6 projected months
- [ ] Balance line shows trajectory
- [ ] Actual vs projected visually distinct
- [ ] Negative balance warning works
- [ ] Empty state handles no data
- [ ] Responsive on mobile
- [ ] i18n works (EN, JA, VI)
- [ ] TypeScript compiles
- [ ] No console errors

---

## Future Enhancements (Out of Scope)

- User-adjustable variable expense assumption
- Scenario modeling ("what if I spend ¥50k less?")
- Goal integration (show when goal will be reached)
- Seasonal adjustment based on historical patterns
- Per-account forecasting

---

**END OF BRAINSTORM**
