import { apiClient } from './api-client'
import type { Budget, BudgetGenerateRequest, BudgetRegenerateRequest, BudgetTracking, BudgetSuggestions } from '@/types'
import type { CategoryHistory } from '@/utils/spending-prediction'

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

/**
 * Get current month's budget tracking with spending data
 */
export async function getBudgetTracking(): Promise<BudgetTracking> {
  const response = await apiClient.get<BudgetTracking>('/api/budgets/tracking/current')
  return response.data
}

/**
 * Get budget suggestions based on previous month
 */
export async function getBudgetSuggestions(): Promise<BudgetSuggestions> {
  const response = await apiClient.get<BudgetSuggestions>('/api/budgets/suggestions')
  return response.data
}

/**
 * Update a single allocation amount
 */
export async function updateAllocation(
  budgetId: number,
  category: string,
  amount: number
): Promise<Budget> {
  const response = await apiClient.patch<Budget>(
    `/api/budgets/${budgetId}/allocations/${encodeURIComponent(category)}`,
    { amount }
  )
  return response.data
}

/**
 * Delete a single allocation
 */
export async function deleteAllocation(
  budgetId: number,
  category: string
): Promise<Budget> {
  const response = await apiClient.delete<Budget>(
    `/api/budgets/${budgetId}/allocations/${encodeURIComponent(category)}`
  )
  return response.data
}

/**
 * Get category spending history for predictions
 */
export async function getCategoryHistory(
  category: string,
  months: number = 3
): Promise<CategoryHistory> {
  const response = await apiClient.get<CategoryHistory>(
    `/api/budgets/category-history/${encodeURIComponent(category)}`,
    { params: { months } }
  )
  return response.data
}
