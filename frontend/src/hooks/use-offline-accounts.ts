/**
 * Hook for accounts with offline support
 */
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { bulkUpdateAccounts, getAllAccounts, type DBAccount } from '../db'
import type { Account } from '../types'

export function useOfflineAccounts<T extends Account[]>(
  fetchFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const data = await fetchFn()
        if (data.length > 0) {
          const dbAccounts: DBAccount[] = data.map(acc => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            initial_balance: acc.initial_balance,
            initial_balance_date: acc.initial_balance_date,
            is_active: acc.is_active,
            currency: acc.currency,
            notes: acc.notes,
            created_at: acc.created_at,
            updated_at: acc.updated_at,
            synced_at: new Date().toISOString(),
            pending_sync: false,
          }))
          await bulkUpdateAccounts(dbAccounts)
        }
        return data
      } catch (error) {
        console.log('Network failed, using cached accounts')
        const cached = await getAllAccounts()
        return cached as unknown as T
      }
    },
    ...options,
  })
}
