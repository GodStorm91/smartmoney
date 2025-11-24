// Analytics types
export interface MonthlyData {
  month: string
  income: number
  expense: number
  net: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  emoji?: string
}

export interface Analytics {
  monthly_trends: MonthlyData[]
  category_breakdown: CategoryBreakdown[]
  total_income: number
  total_expense: number
  net_cashflow: number
}
