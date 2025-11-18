// Transaction types
export interface Transaction {
  id: number
  date: string
  description: string
  amount: number
  category: string
  source: string
  type: 'income' | 'expense'
  created_at: string
}

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

// Goal types
export interface Goal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  years: number // Now supports 1-10 years (custom periods)
  start_date: string
  end_date: string
  status: 'ahead' | 'on-track' | 'behind' | 'achieved'
  monthly_required: number
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
}

export interface GoalProgress {
  goal_id: number
  years: number
  target_amount: number
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
  achievability?: GoalAchievability
}

// Upload types
export interface UploadResult {
  filename: string
  uploaded_at: string
  imported_count: number
  duplicate_count: number
  error_count: number
  errors?: UploadError[]
  status: 'success' | 'warning' | 'completed'
}

export interface UploadError {
  row: number
  message: string
}

// Settings types
export interface Settings {
  currency: string
  base_date: number
  categories: string[]
  sources: string[]
}

// Filter types
export interface TransactionFilters {
  start_date?: string
  end_date?: string
  category?: string
  source?: string
  type?: 'income' | 'expense' | 'all'
}

export interface DateRange {
  start: string
  end: string
}
