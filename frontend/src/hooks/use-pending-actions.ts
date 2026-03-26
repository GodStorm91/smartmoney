import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPendingActions,
  fetchActionCount,
  executeAction,
  dismissAction,
  undoAction,
} from '@/services/pending-action-service'

export function usePendingActions(surface?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['pending-actions', surface],
    queryFn: () => fetchPendingActions(surface),
    staleTime: 5 * 60 * 1000,
  })

  const executeMutation = useMutation({
    mutationFn: (actionId: number) => executeAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-actions'] })
      queryClient.invalidateQueries({ queryKey: ['action-count'] })
    },
  })

  const dismissMutation = useMutation({
    mutationFn: (actionId: number) => dismissAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-actions'] })
      queryClient.invalidateQueries({ queryKey: ['action-count'] })
    },
  })

  const undoMutation = useMutation({
    mutationFn: (actionId: number) => undoAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-actions'] })
      queryClient.invalidateQueries({ queryKey: ['action-count'] })
    },
  })

  return {
    ...query,
    executeMutation,
    dismissMutation,
    undoMutation,
  }
}

export function useActionCount() {
  return useQuery({
    queryKey: ['action-count'],
    queryFn: fetchActionCount,
    staleTime: 5 * 60 * 1000,
  })
}
