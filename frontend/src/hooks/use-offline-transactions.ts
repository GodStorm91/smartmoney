/**
 * Hook for transactions with offline support
 */
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import {
  bulkUpdateTransactions,
  getAllTransactions,
  getTransactionsByDateRange,
  type DBTransaction,
} from '../db'
import type { Transaction, TransactionFilters } from '../types'

// Transform frontend Transaction to DBTransaction
function toDBTransaction(tx: Transaction): DBTransaction {
  return {
    id: tx.id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    category: tx.category,
    source: tx.source,
    type: tx.type,
    created_at: tx.created_at,
    synced_at: new Date().toISOString(),
    pending_sync: false,
  }
}

// Transform DBTransaction to frontend Transaction
function fromDBTransaction(tx: DBTransaction): Transaction {
  return {
    id: tx.id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    currency: (tx as DBTransaction & { currency?: string }).currency || 'JPY',
    category: tx.category,
    source: tx.source,
    type: tx.type,
    created_at: tx.created_at,
  }
}

export function useOfflineTransactions(
  fetchFn: (filters?: TransactionFilters) => Promise<Transaction[]>,
  filters?: TransactionFilters,
  options?: Omit<UseQueryOptions<Transaction[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['transactions', filters?.start_date, filters?.end_date, filters?.categories, filters?.search],
    queryFn: async () => {
      try {
        const data = await fetchFn(filters)
        if (data.length > 0) {
          await bulkUpdateTransactions(data.map(toDBTransaction))
        }
        return data
      } catch (error) {
        console.log('Network failed, using cached transactions')
        let cached: DBTransaction[]
        if (filters?.start_date && filters?.end_date) {
          cached = await getTransactionsByDateRange(filters.start_date, filters.end_date)
        } else {
          cached = await getAllTransactions()
        }
        // Filter by categories if provided
        if (filters?.categories && filters.categories.length > 0 && cached.length > 0) {
          cached = cached.filter(tx => filters.categories!.includes(tx.category))
        }
        // Filter by search if provided
        if (filters?.search && cached.length > 0) {
          const searchLower = filters.search.toLowerCase()
          cached = cached.filter(tx => tx.description.toLowerCase().includes(searchLower))
        }
        return cached.map(fromDBTransaction)
      }
    },
    ...options,
  })
}
