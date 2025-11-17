import { apiClient } from './api-client'
import type { Transaction, TransactionFilters } from '@/types'

/**
 * Fetch all transactions with optional filters
 */
export async function fetchTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.category) params.append('category', filters.category)
  if (filters?.source) params.append('source', filters.source)
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type)

  const response = await apiClient.get<Transaction[]>(`/api/transactions?${params.toString()}`)
  return response.data
}

/**
 * Fetch single transaction by ID
 */
export async function fetchTransaction(id: number): Promise<Transaction> {
  const response = await apiClient.get<Transaction>(`/api/transactions/${id}`)
  return response.data
}

/**
 * Create new transaction
 */
export async function createTransaction(
  data: Omit<Transaction, 'id' | 'created_at'>
): Promise<Transaction> {
  const response = await apiClient.post<Transaction>('/api/transactions', data)
  return response.data
}

/**
 * Update existing transaction
 */
export async function updateTransaction(
  id: number,
  data: Partial<Transaction>
): Promise<Transaction> {
  const response = await apiClient.put<Transaction>(`/api/transactions/${id}`, data)
  return response.data
}

/**
 * Delete transaction
 */
export async function deleteTransaction(id: number): Promise<void> {
  await apiClient.delete(`/api/transactions/${id}`)
}
