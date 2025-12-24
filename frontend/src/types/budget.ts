// Budget types
export interface BudgetAllocation {
  category: string
  amount: number
  reasoning?: string
}

export interface Budget {
  id: number
  month: string
  monthly_income: number
  savings_target?: number
  advice?: string
  language?: string  // Language used for AI advice ('ja', 'en', 'vi')
  carry_over?: number
  allocations: BudgetAllocation[]
  created_at: string
}

export interface BudgetGenerateRequest {
  monthly_income: number
  feedback?: string
  language: string // Language code: 'ja', 'en', 'vi'
}

export interface BudgetRegenerateRequest {
  feedback: string
  language: string // Language code: 'ja', 'en', 'vi'
}

export interface BudgetTrackingItem {
  category: string
  budgeted: number
  spent: number
  remaining: number
  percentage: number
  status: 'green' | 'yellow' | 'orange' | 'red'
}

export interface BudgetTracking {
  month: string
  monthly_income: number
  days_remaining: number
  safe_to_spend_today: number
  total_budgeted: number
  total_spent: number
  savings_target?: number
  carry_over?: number
  effective_budget?: number
  categories: BudgetTrackingItem[]
}
