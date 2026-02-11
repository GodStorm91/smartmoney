// Monthly Usage Report types (mirrors backend schemas/report.py)

export interface ReportSummary {
  total_income: number
  total_expense: number
  net_cashflow: number
  savings_rate: number
  income_change: number
  expense_change: number
  net_change: number
}

export interface BudgetCategoryStatus {
  category: string
  budget_amount: number
  spent: number
  percentage: number
  status: string // normal, threshold_50, threshold_80, over_budget
  spending_change: number | null
  prev_month_spent: number | null
}

export interface FocusAreaItem {
  category: string
  status: string
  budget_amount: number
  spent: number
  amount_over_under: number
  percentage: number
  spending_change: number | null
  suggestion_key: string
  suggestion_params: Record<string, string | number>
}

export interface BudgetAdherence {
  total_budget: number
  total_spent: number
  percentage_used: number
  is_over_budget: boolean
  category_status: BudgetCategoryStatus[]
  focus_areas: FocusAreaItem[]
}

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

export interface GoalProgressItem {
  goal_id: number
  years: number
  target_amount: number
  total_saved: number
  progress_percentage: number
  needed_per_month: number
  status: string // ahead, on_track, behind
}

export interface AccountSummaryItem {
  account_id: number
  account_name: string
  account_type: string
  balance: number
  currency: string
}

export interface ReportInsight {
  type: string
  severity: string
  title: string
  message: string
  category?: string
  amount?: number
  percentage_change?: number
}

export interface MonthlyUsageReportData {
  year: number
  month: number
  month_label: string
  generated_at: string
  summary: ReportSummary
  budget_adherence: BudgetAdherence | null
  category_breakdown: { category: string; amount: number; percentage: number }[]
  spending_trends: { month: string; income: number; expenses: number; net: number }[]
  goal_progress: GoalProgressItem[]
  account_summary: AccountSummaryItem[]
  insights: ReportInsight[]
  total_net_worth: number
}
