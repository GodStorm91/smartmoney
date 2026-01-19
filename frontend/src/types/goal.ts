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
  trend_months_requested: number
  trend_months_actual: number
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
