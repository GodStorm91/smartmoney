/**
 * Hook for budgets with offline support
 */
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { bulkUpdateBudgets, getAllBudgets, type DBBudget } from '../db'
import type { Budget } from '../types'

export function useOfflineBudgets(
  fetchFn: () => Promise<Budget[]>,
  options?: Omit<UseQueryOptions<Budget[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      try {
        const data = await fetchFn()
        if (data.length > 0) {
          const dbBudgets: DBBudget[] = data.map(b => ({
            id: b.id,
            month: b.month,
            monthly_income: b.monthly_income,
            savings_target: b.savings_target,
            advice: b.advice,
            allocations: b.allocations,
            created_at: b.created_at,
            synced_at: new Date().toISOString(),
            pending_sync: false,
          }))
          await bulkUpdateBudgets(dbBudgets)
        }
        return data
      } catch (error) {
        console.log('Network failed, using cached budgets')
        const cached = await getAllBudgets()
        return cached.map(b => ({
          id: b.id,
          month: b.month,
          monthly_income: b.monthly_income,
          savings_target: b.savings_target,
          advice: b.advice,
          allocations: b.allocations,
          created_at: b.created_at,
        })) as Budget[]
      }
    },
    ...options,
  })
}
