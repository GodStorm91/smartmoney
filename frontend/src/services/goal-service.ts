import { apiClient } from './api-client'
import type { Goal, GoalCreate, GoalUpdate, GoalProgress, GoalReorderRequest, GoalTemplateResponse } from '@/types/goal'

/**
 * Fetch all goals
 */
export async function fetchGoals(): Promise<Goal[]> {
  const response = await apiClient.get<Goal[]>('/api/goals/')
  return response.data
}

/**
 * Fetch single goal by ID
 */
export async function fetchGoal(id: number): Promise<Goal> {
  const response = await apiClient.get<Goal>(`/api/goals/${id}`)
  return response.data
}

/**
 * Create new goal
 */
export async function createGoal(data: GoalCreate): Promise<Goal> {
  const response = await apiClient.post<Goal>('/api/goals/', data)
  return response.data
}

/**
 * Update existing goal
 */
export async function updateGoal(id: number, data: GoalUpdate): Promise<Goal> {
  const response = await apiClient.put<Goal>(`/api/goals/${id}`, data)
  return response.data
}

/**
 * Delete goal
 */
export async function deleteGoal(id: number): Promise<void> {
  await apiClient.delete(`/api/goals/${id}`)
}

/**
 * Fetch goal progress with optional achievability metrics
 */
export async function fetchGoalProgress(
  goalId: number,
  includeAchievability: boolean = true,
  trendMonths: number = 3
): Promise<GoalProgress> {
  const params = new URLSearchParams()
  if (includeAchievability) {
    params.append('include_achievability', 'true')
    params.append('trend_months', trendMonths.toString())
  }

  const response = await apiClient.get<GoalProgress>(
    `/api/goals/${goalId}/progress?${params.toString()}`
  )
  return response.data
}

/**
 * Check if user has emergency fund goal
 */
export async function hasEmergencyFund(): Promise<boolean> {
  const response = await apiClient.get<{ has_emergency_fund: boolean }>(
    '/api/goals/status/has-emergency-fund'
  )
  return response.data.has_emergency_fund
}

/**
 * Reorder goals by priority
 */
export async function reorderGoals(request: GoalReorderRequest): Promise<Goal[]> {
  const response = await apiClient.post<Goal[]>('/api/goals/reorder', request)
  return response.data
}

/**
 * Get AI-suggested goal template for a specific goal type
 */
export async function fetchGoalTemplate(
  goalType: string,
  years: number = 3,
  language: string = 'ja'
): Promise<GoalTemplateResponse> {
  const params = new URLSearchParams({
    years: years.toString(),
    language
  })
  const response = await apiClient.get<GoalTemplateResponse>(
    `/api/goals/templates/${goalType}?${params.toString()}`
  )
  return response.data
}
