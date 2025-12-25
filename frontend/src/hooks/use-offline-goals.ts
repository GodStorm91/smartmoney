/**
 * Hook for goals with offline support
 */
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { bulkUpdateGoals, getAllGoals, type DBGoal } from '../db'
import type { Goal } from '../types/goal'

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
            goal_type: g.goal_type,
            name: g.name,
            years: g.years,
            target_amount: g.target_amount,
            start_date: g.start_date,
            priority: g.priority,
            account_id: g.account_id,
            ai_advice: g.ai_advice,
            milestone_25_at: g.milestone_25_at,
            milestone_50_at: g.milestone_50_at,
            milestone_75_at: g.milestone_75_at,
            milestone_100_at: g.milestone_100_at,
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
          goal_type: g.goal_type,
          name: g.name,
          years: g.years,
          target_amount: g.target_amount,
          start_date: g.start_date,
          priority: g.priority,
          account_id: g.account_id,
          ai_advice: g.ai_advice,
          milestone_25_at: g.milestone_25_at,
          milestone_50_at: g.milestone_50_at,
          milestone_75_at: g.milestone_75_at,
          milestone_100_at: g.milestone_100_at,
        })) as Goal[]
      }
    },
    ...options,
  })
}
