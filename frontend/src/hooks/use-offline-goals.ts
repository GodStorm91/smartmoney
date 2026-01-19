/**
 * Hook for goals with offline support
 */
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { bulkUpdateGoals, getAllGoals, type DBGoal } from '../db'
import type { Goal } from '../types'

export function useOfflineGoals(
  fetchFn: () => Promise<Goal[]>,
  options?: Omit<UseQueryOptions<Goal[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      try {
        const data = await fetchFn()
        if (data.length > 0) {
          const dbGoals: DBGoal[] = data.map(g => ({
            id: g.id,
            name: g.name,
            target_amount: g.target_amount,
            current_amount: g.current_amount,
            years: g.years,
            start_date: g.start_date,
            end_date: g.end_date,
            status: g.status,
            monthly_required: g.monthly_required,
            synced_at: new Date().toISOString(),
            pending_sync: false,
          }))
          await bulkUpdateGoals(dbGoals)
        }
        return data
      } catch (error) {
        console.log('Network failed, using cached goals')
        const cached = await getAllGoals()
        return cached.map(g => ({
          id: g.id,
          name: g.name,
          target_amount: g.target_amount,
          current_amount: g.current_amount,
          years: g.years,
          start_date: g.start_date,
          end_date: g.end_date,
          status: g.status,
          monthly_required: g.monthly_required,
        })) as Goal[]
      }
    },
    ...options,
  })
}
