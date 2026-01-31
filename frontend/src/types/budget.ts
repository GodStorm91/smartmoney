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
  // Version tracking
  version?: number
  is_active?: boolean
  copied_from_id?: number | null
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

export interface BudgetAllocationSuggestion {
  category: string
  amount: number
}

export interface BudgetSuggestions {
  has_previous: boolean
  previous_month: string | null
  previous_income: number | null
  previous_allocations: BudgetAllocationSuggestion[] | null
  carry_over: number
}

// Budget copy and versioning types
export interface BudgetCopyRequest {
  source_month: string
  target_month: string
  monthly_income?: number
}

export interface AllocationSpendingSummary {
  category: string
  budgeted: number
  spent: number
  remaining: number
  over_budget: boolean
}

export interface BudgetCopyPreview {
  source_budget: Budget
  target_month: string
  spending_summary: AllocationSpendingSummary[]
}

export interface BudgetVersion {
  id: number
  version: number
  is_active: boolean
  created_at: string
  monthly_income: number
  total_allocated: number
  copied_from_id?: number | null
}
