# Backend Monthly Report Research

**Date:** 2026-02-11
**Focus:** SmartMoney monthly report feature architecture & data flows

---

## 1. Current Monthly Report Data Structure

`MonthlyUsageReportData` schema (backend/app/schemas/report.py):

```
- year, month, month_label, generated_at
- summary: ReportSummary
  - total_income, total_expense, net_cashflow
  - savings_rate (% of income saved)
  - income_change, expense_change, net_change (% vs prev month, from DashboardService)
- budget_adherence: Optional[BudgetAdherence]
  - total_budget, total_spent, percentage_used, is_over_budget
  - category_status: list[BudgetCategoryStatus]
- category_breakdown: list[dict] (from AnalyticsService)
- spending_trends: list[dict] (last 3 months including current)
- goal_progress: list[GoalProgressItem]
  - goal_id, years, target_amount, total_saved, progress_percentage, needed_per_month, status
- account_summary: list[AccountSummaryItem]
  - account_id, account_name, account_type, balance, currency
- insights: list[ReportInsight] (max 10 from AnalyticsService)
  - type, severity, title, message, category, amount, percentage_change
- total_net_worth: int (sum of all active account balances in JPY)
```

**All monetary amounts in cents (integer).**

---

## 2. Report API Endpoints

### 2.1 Primary Endpoints (reports.py)

| Endpoint | Method | Path | Response | Purpose |
|----------|--------|------|----------|---------|
| `get_monthly_usage_report` | GET | `/api/reports/monthly-usage/{year}/{month}` | `MonthlyUsageReportData` (JSON) | Get structured data for display |
| `download_monthly_usage_pdf` | GET | `/api/reports/monthly-usage/{year}/{month}/pdf` | PDF bytes | Export report as PDF |
| `generate_monthly_report` (legacy) | GET | `/api/reports/monthly` | PDF bytes | Simple monthly PDF (reuses yearly logic) |
| `generate_yearly_report` | GET | `/api/reports/yearly` | PDF bytes | Yearly report PDF |
| `generate_deductible_report` | GET | `/api/reports/deductible` | PDF bytes | Tax deductible expenses |
| `export_transactions_csv` | GET | `/api/reports/transactions/csv` | CSV bytes | Transaction export |

**Path validation:** year [2020-2100], month [1-12]

---

## 3. ClaudeAIService: Prompt & Response Patterns

**Model:** `claude-3-5-haiku-20241022` (Haiku)
**Location:** backend/app/services/claude_ai_service.py

### 3.1 Methods

1. **`generate_budget()`** — Generate budget allocations
   - Input: monthly_income, category_spending, valid_categories, feedback, language
   - Output: `dict[str, Any]` with allocations, savings_target, advice
   - Calls `_build_budget_prompt()` helper (from budget_prompt_helpers.py)
   - Temperature: 0.7, max_tokens: 2048

2. **`generate_budget_with_tracking()`** — Same as above but returns `(budget_data, usage_dict)`
   - `usage_dict` has: `input_tokens`, `output_tokens`
   - Used for credit deduction tracking

3. **`categorize_transactions()`** — Classify transactions
   - Input: transactions list (id, description, amount), available_categories hierarchy
   - Output: `(results: list[dict], usage: dict)`
   - Each result: `{id, category, confidence (0.0-1.0), reason (in target language)}`
   - Allows "NEW:Category" prefix for new categories
   - Language-aware prompts (ja/en/vi)
   - Temperature: 0.3 (lower for consistency)

### 3.2 Prompt Pattern

```python
prompt = f"""IMPORTANT: You MUST respond entirely in {language_name}...

[System instructions]

[Data/context formatted as plain text]

REQUIRED OUTPUT FORMAT (JSON array):
[...]

RULES:
- [specific constraints]
- [fallback logic]

[Action]: """
```

Response parsing: Extract JSON from `response.content[0].text` using string indexing `find("[")` and `rfind("]")`

---

## 4. Month-over-Month Comparison Logic

**Implementation:** DashboardService.get_summary()

```python
@staticmethod
def get_summary(db: Session, user_id: int, month: Optional[str] = None) -> dict:
    """Get current month data + compare to previous month."""
    current_data = DashboardService._get_month_data(db, user_id, current_month_key)
    previous_data = DashboardService._get_month_data(db, user_id, previous_month_key)

    income_change = _calculate_change(previous_data["income"], current_data["income"])
    expense_change = _calculate_change(previous_data["expense"], current_data["expense"])
    net_change = _calculate_change(previous_data["net"], current_data["net"])

    return {
        "income": current_data["income"],
        "expense": current_data["expense"],
        "net": current_data["net"],
        "income_change": income_change,      # % change
        "expense_change": expense_change,    # % change
        "net_change": net_change,            # % change
    }
```

**`_calculate_change()` formula:** `((current - previous) / previous) * 100` (percentage)

All amounts already converted to JPY via `_get_month_data()`.

---

## 5. Credit Cost Calculation Pattern

**Current usage tracking (ClaudeAIService):**

```python
usage = {
    "input_tokens": response.usage.input_tokens,
    "output_tokens": response.usage.output_tokens
}
```

**Relevant service:** backend/app/services/budget_tracking_service.py
(Not fully reviewed, but pattern shows token counting for credit deduction)

**No pricing logic found in reviewed files.** Pricing likely in separate credits module (backend/app/routes/credits.py — not reviewed).

---

## 6. Service Call Graph

MonthlyReportService.generate_report() orchestrates:

1. **DashboardService.get_summary()** — Summary + MoM changes
2. **AnalyticsService.get_category_breakdown()** — Category totals
3. **AnalyticsService.get_monthly_trend()** — Last 3 months
4. **BudgetAlertService.get_budget_with_allocations()** — Budget data
5. **BudgetAlertService.get_threshold_status()** — Budget adherence
6. **GoalService.get_all_goals()** + calculate_goal_progress() — Goal tracking
7. **AccountService.calculate_balance()** — Account balances
8. **ExchangeRateService.get_cached_rates()** — Currency conversion
9. **AnalyticsService.generate_spending_insights()** — Auto-insights (max 10)

---

## 7. PDF Generation

**Service:** MonthlyReportPDFService (backend/app/services/monthly_report_pdf_service.py)
**Method:** `generate_monthly_usage_pdf(data: MonthlyUsageReportData) -> bytes`

Handles Japanese text via CID font `HeiseiKakuGo-W5` (per project memory).

---

## Unresolved Questions

1. **Missing endpoint:** Is there a `/api/reports/monthly-usage/{year}/{month}/summary` endpoint that returns only ReportSummary for quick MoM comparisons? (Not found in reviewed routes)

2. **AI summary generation:** No method found to generate natural language summary (e.g., "Your spending decreased 5% this month..."). Is this planned for UX improvements? ClaudeAIService has budget/categorization methods but no report summary method.

3. **Insight filtering:** AnalyticsService.generate_spending_insights() returns unordered insights — report takes first 10. What's the sorting/priority order? (Implementation not reviewed)

4. **PDF caching:** MonthlyReportPDFService — is PDF cached or regenerated on each request?

5. **Data freshness:** When category_breakdown/spending_trends queries run, are they using end-of-month snapshots or real-time data?
