# Frontend Monthly Report Research

## Overview
SmartMoney's monthly report feature spans from dedicated `/monthly-report` page to embedded display on dashboard. System uses React Query for data fetching, Tailwind + shadcn/ui for styling.

## MonthlyReport.tsx Component
**File:** `/frontend/src/pages/MonthlyReport.tsx` (199 lines)

**Structure:**
- Functional component with optional `embedded` prop (for dashboard/embedded display)
- Uses `useTranslation()` + `useState()` for month selection
- `useQuery` fetches `MonthlyUsageReportData` via `fetchMonthlyReport(year, month)`
- Stale time: 5 minutes
- Lazy loads: only renders data when report query completes

**Layout flow:**
1. ReportHeader (with PDF download button)
2. MonthPicker (month navigation)
3. Summary metrics (4 MetricCards: income, expense, net, savings_rate)
4. BudgetAdherenceTable (conditional: only if `report.budget_adherence` exists)
5. CategoryBarChart (category breakdown)
6. IncomeExpenseBarChart (spending trends)
7. GoalProgressCard list (per goal)
8. AccountSummaryCard (net worth + accounts)
9. Insights section (list of insight objects)
10. Empty state (if no data)

**Key Methods:**
- `handleDownloadPDF()`: Streams blob, creates object URL, triggers browser download, revokes URL
- PDF filename format: `monthly_report_YYYY_MM.pdf`

## BudgetAdherenceTable.tsx
**File:** `/frontend/src/components/report/BudgetAdherenceTable.tsx` (77 lines)

**Current verbose implementation:**
- Overall progress bar + percentage display
- Category rows with:
  - Category name + status badge (error/warning/info/success)
  - Progress bar per category
  - Spent/Budget amounts in right column
- Status mapping: `over_budget` → error, `threshold_80` → warning, `threshold_50` → info, default → success
- Uses `Progress` component + `Badge` component from UI library

**Props:** `BudgetAdherence` data (has `total_budget`, `total_spent`, `percentage_used`, `is_over_budget`, `category_status[]`)

**Issue:** Component renders every category regardless of space — no truncation/focus on problem areas. Perfect candidate for UX improvements per research.

## Report Service (API layer)
**File:** `/frontend/src/services/report-service.ts` (30 lines)

**API Methods:**
```typescript
fetchMonthlyReport(year: number, month: number): Promise<MonthlyUsageReportData>
  → GET /api/reports/monthly-usage/{year}/{month}

downloadMonthlyReportPDF(year: number, month: number): Promise<Blob>
  → GET /api/reports/monthly-usage/{year}/{month}/pdf
  → responseType: 'blob'
```
Both use `apiClient` singleton for requests.

## Dashboard.tsx Integration Point
**File:** `/frontend/src/pages/Dashboard.tsx` (376 lines)

**Current Structure (no report integration yet):**
- Sticky header with month navigation (separate from monthly report)
- 9 main sections:
  1. Onboarding checklist
  2. Proxy receivables widget
  3. Net worth hero (summary card)
  4. Dashboard alerts (overspending/low savings)
  5. Quick actions (4 buttons: Add, Scan, Upload, Analytics)
  6. KPI row + Income/Expense/Savings cards
  7. Recent transactions (5 max)
  8. Spending calendar
  9. Goals progress (limited to 2)

**Banner Integration Point:** Would slot after alerts (#4) or as alternative to recent transactions (#7). Spacing handled via `space-y-4` gaps. Uses `Card` wrapper + Link to `/monthly-report`.

**Responsive:** max-width 2xl (42rem), mobile-first grid layout with gap-3 spacing.

## Report TypeScript Types
**File:** `/frontend/src/types/report.ts` (71 lines)

**Core Interfaces:**
```typescript
ReportSummary {
  total_income, total_expense, net_cashflow, savings_rate,
  income_change, expense_change, net_change: number
}

BudgetAdherence {
  total_budget, total_spent, percentage_used: number
  is_over_budget: boolean
  category_status: BudgetCategoryStatus[]
}

BudgetCategoryStatus {
  category: string
  budget_amount, spent, percentage: number
  status: string (normal|threshold_50|threshold_80|over_budget)
}

MonthlyUsageReportData {
  year, month: number
  month_label: string
  generated_at: string
  summary: ReportSummary
  budget_adherence: BudgetAdherence | null
  category_breakdown, spending_trends, goal_progress, account_summary, insights
  total_net_worth: number
}

ReportInsight {
  type, severity, title, message: string
  category?, amount?, percentage_change?: optional
}
```

## i18n Keys (Report section)
**File:** `/frontend/public/locales/en/common.json`

**Available keys:**
- `report.loadError`, `report.downloadError`
- `report.budgetAdherence`, `report.categoryBreakdown`, `report.spendingTrends`
- `report.goalProgress`, `report.accountSummary`, `report.insights`
- `report.savingsRate`, `report.savingsRateDesc`
- `report.onTrack`, `report.caution`, `report.warning`, `report.overBudget`
- `report.noData`
- `insights.deductibleReportDesc`
- Insight types: `insightSpike`, `insightTrend`, `insightUnusual`, `insightBudget`, `insightSaving`
- `insightsHint`, `insightsDisclaimer`

## Data Flow Summary
1. Dashboard/Report page calls `fetchMonthlyReport(year, month)` via React Query
2. Backend returns `MonthlyUsageReportData` (9 sections)
3. Components render conditionally based on data presence
4. PDF download streams blob → creates object URL → triggers click → revokes
5. No pagination; all data loaded at once (suitable for 1-month scope)

## Unresolved Questions
1. Should dashboard banner link to full report page or embed MonthlyReport component with `embedded={true}`?
2. Report i18n keys exist in locale file but some are under `insights` root — is there a namespace/prefix convention?
3. Does the banner need to show mini summary metrics or just CTA link?
4. Should dashboard show hardcoded current month or allow same month-picker as report?
