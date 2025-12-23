import { apiClient } from './api-client'
import type { Transaction, TransactionFilters } from '@/types'

interface BackendTransaction {
  id: number
  date: string
  description: string
  amount: number
  category: string
  source: string
  is_income: boolean
  is_transfer: boolean
  month_key: string
  tx_hash: string
}

interface TransactionListResponse {
  transactions: BackendTransaction[]
  total: number
  limit: number
  offset: number
}

/**
 * Transform backend transaction to frontend format
 */
function transformTransaction(tx: BackendTransaction): Transaction {
  return {
    id: tx.id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    category: tx.category,
    source: tx.source,
    type: tx.is_income ? 'income' : 'expense',
    created_at: tx.date, // Use date as created_at fallback
  }
}

/**
 * Fetch all transactions with optional filters
 */
export async function fetchTransactions(
  filters?: TransactionFilters
): Promise<Transaction[]> {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.categories?.length) {
    params.append('categories', filters.categories.join(','))
  }
  if (filters?.source) params.append('source', filters.source)
  if (filters?.type && filters.type !== 'all') {
    params.append('is_income', filters.type === 'income' ? 'true' : 'false')
  }
  if (filters?.search) params.append('search', filters.search)

  const response = await apiClient.get<TransactionListResponse>(`/api/transactions/?${params.toString()}`)
  return response.data.transactions.map(transformTransaction)
}

/**
 * Fetch single transaction by ID
 */
export async function fetchTransaction(id: number): Promise<Transaction> {
  const response = await apiClient.get<BackendTransaction>(`/api/transactions/${id}`)
  return transformTransaction(response.data)
}

/**
 * Transform frontend transaction to backend format
 */
function transformToBackend(data: Omit<Transaction, 'id' | 'created_at'> | Partial<Transaction>): any {
  const { type, ...rest } = data as Transaction
  return {
    ...rest,
    is_income: type === 'income'
  }
}

/**
 * Create new transaction
 */
export async function createTransaction(
  data: Omit<Transaction, 'id' | 'created_at'>
): Promise<Transaction> {
  const backendData = transformToBackend(data)
  const response = await apiClient.post<BackendTransaction>('/api/transactions/', backendData)
  return transformTransaction(response.data)
}

/**
 * Update existing transaction
 */
export async function updateTransaction(
  id: number,
  data: Partial<Transaction>
): Promise<Transaction> {
  const backendData = transformToBackend(data)
  const response = await apiClient.put<BackendTransaction>(`/api/transactions/${id}`, backendData)
  return transformTransaction(response.data)
}

/**
 * Delete transaction
 */
export async function deleteTransaction(id: number): Promise<void> {
  await apiClient.delete(`/api/transactions/${id}`)
}

/**
 * Bulk delete transactions
 */
export async function bulkDeleteTransactions(ids: number[]): Promise<{ deleted: number }> {
  const params = new URLSearchParams()
  ids.forEach(id => params.append('transaction_ids', id.toString()))
  const response = await apiClient.delete<{ deleted: number }>(`/api/transactions/bulk/delete?${params.toString()}`)
  return response.data
}

/**
 * Bulk update category for transactions
 */
export async function bulkUpdateCategory(
  ids: number[],
  category: string
): Promise<{ updated: number; category: string }> {
  const params = new URLSearchParams()
  ids.forEach(id => params.append('transaction_ids', id.toString()))
  params.append('category', category)
  const response = await apiClient.patch<{ updated: number; category: string }>(
    `/api/transactions/bulk/category?${params.toString()}`
  )
  return response.data
}

/**
 * Transaction suggestion for autocomplete
 */
export interface TransactionSuggestion {
  description: string
  amount: number
  category: string
  is_income: boolean
  count: number
}

/**
 * Fetch autocomplete suggestions based on query
 */
export async function fetchTransactionSuggestions(
  query: string,
  limit: number = 5
): Promise<TransactionSuggestion[]> {
  if (!query || query.length < 2) return []

  const response = await apiClient.get<TransactionSuggestion[]>(
    `/api/transactions/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`
  )
  return response.data
}
