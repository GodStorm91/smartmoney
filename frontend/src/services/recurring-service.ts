/**
 * Service for recurring transactions API calls
 */
import { apiClient } from './api-client'

export type FrequencyType = 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface RecurringTransaction {
  id: number
  description: string
  amount: number
  category: string
  account_id: number | null
  is_income: boolean
  frequency: FrequencyType
  interval_days: number | null
  day_of_week: number | null
  day_of_month: number | null
  next_run_date: string
  last_run_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RecurringTransactionCreate {
  description: string
  amount: number
  category: string
  account_id?: number | null
  is_income: boolean
  frequency: FrequencyType
  interval_days?: number | null
  day_of_week?: number | null
  day_of_month?: number | null
  start_date: string
}

export interface RecurringTransactionUpdate {
  description?: string
  amount?: number
  category?: string
  account_id?: number | null
  is_income?: boolean
  frequency?: FrequencyType
  interval_days?: number | null
  day_of_week?: number | null
  day_of_month?: number | null
  is_active?: boolean
}

interface RecurringListResponse {
  recurring_transactions: RecurringTransaction[]
  total: number
}

/**
 * Fetch all recurring transactions for current user
 */
export async function fetchRecurringTransactions(
  activeOnly: boolean = false
): Promise<RecurringTransaction[]> {
  const params = new URLSearchParams()
  if (activeOnly) params.append('active_only', 'true')

  const response = await apiClient.get<RecurringListResponse>(
    `/api/recurring/?${params.toString()}`
  )
  return response.data.recurring_transactions
}

/**
 * Fetch a single recurring transaction by ID
 */
export async function fetchRecurringTransaction(
  id: number
): Promise<RecurringTransaction> {
  const response = await apiClient.get<RecurringTransaction>(`/api/recurring/${id}`)
  return response.data
}

/**
 * Create a new recurring transaction
 */
export async function createRecurringTransaction(
  data: RecurringTransactionCreate
): Promise<RecurringTransaction> {
  const response = await apiClient.post<RecurringTransaction>('/api/recurring/', data)
  return response.data
}

/**
 * Update an existing recurring transaction
 */
export async function updateRecurringTransaction(
  id: number,
  data: RecurringTransactionUpdate
): Promise<RecurringTransaction> {
  const response = await apiClient.patch<RecurringTransaction>(
    `/api/recurring/${id}`,
    data
  )
  return response.data
}

/**
 * Delete a recurring transaction
 */
export async function deleteRecurringTransaction(id: number): Promise<void> {
  await apiClient.delete(`/api/recurring/${id}`)
}

/**
 * Manually trigger a recurring transaction (for testing)
 */
export async function runRecurringTransaction(
  id: number
): Promise<{ message: string; next_run_date: string }> {
  const response = await apiClient.post<{ message: string; next_run_date: string }>(
    `/api/recurring/${id}/run`
  )
  return response.data
}
