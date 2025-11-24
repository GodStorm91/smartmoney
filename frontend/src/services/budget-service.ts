import { apiClient } from './api-client'
import type { Budget, BudgetGenerateRequest, BudgetRegenerateRequest } from '@/types'

/**
 * Generate new budget using AI
 */
export async function generateBudget(data: BudgetGenerateRequest): Promise<Budget> {
  const response = await apiClient.post<Budget>('/api/budgets/generate', data)
  return response.data
}

/**
 * Get current month's budget
 */
export async function getCurrentBudget(): Promise<Budget> {
  const response = await apiClient.get<Budget>('/api/budgets/current')
  return response.data
}

/**
 * Regenerate budget with feedback
 */
export async function regenerateBudget(
  budgetId: number,
  data: BudgetRegenerateRequest
): Promise<Budget> {
  const response = await apiClient.post<Budget>(`/api/budgets/${budgetId}/regenerate`, data)
  return response.data
}

/**
 * Get budget history
 */
export async function getBudgetHistory(limit: number = 12): Promise<Budget[]> {
  const response = await apiClient.get<Budget[]>('/api/budgets/history', {
    params: { limit }
  })
  return response.data
}

/**
 * Get budget for specific month
 */
export async function getBudgetByMonth(month: string): Promise<Budget> {
  const response = await apiClient.get<Budget>(`/api/budgets/${month}`)
  return response.data
}
