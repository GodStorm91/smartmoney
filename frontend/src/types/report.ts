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
}

export interface BudgetAdherence {
  total_budget: number
  total_spent: number
  percentage_used: number
  is_over_budget: boolean
  category_status: BudgetCategoryStatus[]
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
