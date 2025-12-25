// Goal type enum matching backend
export type GoalType =
  | 'emergency_fund'
  | 'home_down_payment'
  | 'vacation_travel'
  | 'vehicle'
  | 'education'
  | 'wedding'
  | 'large_purchase'
  | 'debt_payoff'
  | 'retirement'
  | 'investment'
  | 'custom'

// Supported currencies
export type GoalCurrency = 'JPY' | 'USD' | 'VND'

// Goal create/update interfaces
export interface GoalCreate {
  goal_type: GoalType
  name?: string
  years: number // 1-10 years
  target_amount: number
  currency?: GoalCurrency
  start_date?: string
  account_id?: number
}

export interface GoalUpdate {
  name?: string
  target_amount?: number
  start_date?: string
  account_id?: number
  priority?: number
}

// Goal response from API
export interface Goal {
  id: number
  goal_type: GoalType
  name?: string
  years: number
  target_amount: number
  currency: GoalCurrency
  start_date?: string
  priority: number
  account_id?: number
  ai_advice?: string
  milestone_25_at?: string
  milestone_50_at?: string
  milestone_75_at?: string
  milestone_100_at?: string
  // Linked account info (populated by service)
  account_name?: string
  account_balance?: number
}

export interface GoalAchievability {
  current_monthly_net: number
  achievable_amount: number
  achievable_percentage: number
  required_monthly: number
  monthly_gap: number
  status_tier: 'on_track' | 'achievable' | 'challenging' | 'deficit' | 'severe_deficit'
  recommendation: string
  data_source: string
  months_remaining: number
  trend_months_requested: number
  trend_months_actual: number
}

export interface GoalProgress {
  goal_id: number
  goal_type: GoalType
  name?: string
  years: number
  target_amount: number
  currency: GoalCurrency
  start_date: string
  target_date: string
  current_date: string
  total_saved: number
  progress_percentage: number
  months_total: number
  months_elapsed: number
  months_remaining: number
  avg_monthly_net: number
  needed_per_month: number
  needed_remaining: number
  projected_total: number
  status: string
  priority: number
  account_id?: number
  account_name?: string
  milestone_25_at?: string
  milestone_50_at?: string
  milestone_75_at?: string
  milestone_100_at?: string
  achievability?: GoalAchievability
}

export interface GoalReorderRequest {
  goal_ids: number[]
}

export interface GoalTemplateResponse {
  goal_type: GoalType
  suggested_target: number
  suggested_years: number
  monthly_required: number
  achievable: boolean
  advice: string
}
