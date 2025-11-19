import { apiClient } from './api-client'
import type { Goal, GoalProgress } from '@/types'

/**
 * Fetch all goals
 */
export async function fetchGoals(): Promise<Goal[]> {
  const response = await apiClient.get<Goal[]>('/api/goals')
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
export async function createGoal(
  data: Omit<Goal, 'id' | 'current_amount' | 'status' | 'monthly_required'>
): Promise<Goal> {
  const response = await apiClient.post<Goal>('/api/goals', data)
  return response.data
}

/**
 * Update existing goal
 */
export async function updateGoal(id: number, data: Partial<Goal>): Promise<Goal> {
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
