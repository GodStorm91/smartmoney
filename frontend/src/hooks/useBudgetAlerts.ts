import { useQuery, useMutation } from '@tanstack/react-query'
import { alertService } from '@/services/alert-service'
import type { BudgetAlert } from '@/types'

export function useBudgetAlerts(options?: { unreadOnly?: boolean; limit?: number }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['budgetAlerts', options],
    queryFn: () => alertService.getAlerts(options),
  })

  const markAsRead = useMutation({
    mutationFn: (alertId: number | string) => alertService.markAsRead(Number(alertId)),
    onSuccess: () => refetch(),
  })

  const markAllAsRead = useMutation({
    mutationFn: () => alertService.markAllAsRead(),
    onSuccess: () => refetch(),
  })

  return {
    alerts: data?.alerts ?? [],
    totalCount: data?.total_count ?? 0,
    unreadCount: data?.unread_count ?? 0,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch,
  }
}

export function useThresholdStatus(budgetId: number | null) {
  return useQuery({
    queryKey: ['budgetThresholdStatus', budgetId],
    queryFn: () => alertService.getThresholdStatus(budgetId!),
    enabled: !!budgetId,
  })
}
