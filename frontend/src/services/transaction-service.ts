import { apiClient } from './api-client'
import type { Transaction, TransactionFilters } from '@/types'

interface BackendTransaction {
  id: number
  date: string
  description: string
  amount: number
  currency: string
  category: string
  source: string
  is_income: boolean
  is_transfer: boolean
  is_adjustment: boolean
  transfer_type?: string | null
  month_key: string
  tx_hash: string
  account_id?: number | null
  receipt_url?: string | null
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
    currency: tx.currency || 'JPY',
    category: tx.category,
    source: tx.source,
    type: tx.is_income ? 'income' : 'expense',
    created_at: tx.date, // Use date as created_at fallback
    account_id: tx.account_id,
    is_transfer: tx.is_transfer,
    is_adjustment: tx.is_adjustment,
    transfer_type: tx.transfer_type,
    receipt_url: tx.receipt_url,
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
  if (filters?.min_amount !== undefined) params.append('min_amount', filters.min_amount.toString())
  if (filters?.max_amount !== undefined) params.append('max_amount', filters.max_amount.toString())
  if (filters?.account_id) params.append('account_id', filters.account_id.toString())

  // Request transactions (backend max is 1000)
  params.append('limit', '1000')

  console.log('[fetchTransactions] filters:', filters, 'params:', params.toString())
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

/**
 * Duplicate detection types
 */
export interface DuplicateTransaction {
  id: number
  date: string
  description: string
  amount: number
  currency: string
  category: string
  source: string
  type: 'income' | 'expense'
  account_id: number | null
}

export interface DuplicatePair {
  transaction_1: DuplicateTransaction
  transaction_2: DuplicateTransaction
  similarity: number
  date_diff_days: number
}

export interface DuplicatesResponse {
  duplicates: DuplicatePair[]
  count: number
}

/**
 * Fetch potential duplicate transaction pairs
 */
export async function fetchDuplicates(threshold = 0.75, dateWindow = 3): Promise<DuplicatesResponse> {
  const { data } = await apiClient.get<DuplicatesResponse>('/api/transactions/duplicates', {
    params: { threshold, date_window: dateWindow }
  })
  return data
}

/**
 * Resolve a duplicate pair by merging or dismissing
 */
export async function resolveDuplicate(
  action: 'merge' | 'dismiss',
  keepId: number,
  removeId: number
): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<{ success: boolean }>('/api/transactions/duplicates/resolve', null, {
    params: { action, keep_id: keepId, remove_id: removeId }
  })
  return data
}
