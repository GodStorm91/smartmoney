export type ActionType =
  | 'review_uncategorized'
  | 'copy_or_create_budget'
  | 'adjust_budget_category'
  | 'review_goal_catch_up'
  | 'monthly_report_nudge'
export type ActionSurface = 'dashboard' | 'budget_page' | 'goals_page' | 'report_page'
export type ActionStatus = 'pending' | 'surfaced' | 'executed' | 'dismissed' | 'expired' | 'undone'

export interface PendingAction {
  id: number
  type: ActionType
  surface: ActionSurface
  title: string
  description: string | null
  params: Record<string, unknown>
  status: ActionStatus
  priority: number
  created_at: string
  surfaced_at: string | null
  tapped_at: string | null
  expires_at: string | null
  executed_at: string | null
  dismissed_at: string | null
  undone_at: string | null
}

export interface PendingActionListResponse {
  actions: PendingAction[]
  count: number
}

export interface ActionExecuteResponse {
  success: boolean
  message: string
  undo_available: boolean
}
