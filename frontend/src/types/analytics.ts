// Analytics types
export interface MonthlyData {
  month: string
  income: number
  expenses: number  // Note: backend returns 'expenses' (plural)
  net: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  emoji?: string
  previous_amount?: number | null  // Amount in previous period
  change_percent?: number | null   // Percentage change vs previous
}

export interface ComparisonData {
  income_change: number | null
  expense_change: number | null
  net_change: number | null
}

export interface TopCategory {
  name: string
  amount: number
  percentage: number
}

export interface Analytics {
  monthly_trends: MonthlyData[]
  category_breakdown: CategoryBreakdown[]
  total_income: number
  total_expense: number
  net_cashflow: number
  comparison: ComparisonData | null
  top_category: TopCategory | null
}

export interface SpendingInsight {
  type: 'spike' | 'trend' | 'unusual' | 'budget' | 'saving'
  severity: 'info' | 'warning' | 'success'
  title: string
  message: string
  category?: string
  amount?: number
  percentage_change?: number
}

export interface SpendingInsightsResponse {
  insights: SpendingInsight[]
  generated_at: string
}
