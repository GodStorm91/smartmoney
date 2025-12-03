/**
 * Hook for mutations with offline support
 * Queues failed mutations for background sync
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enqueueOperation } from '../lib/sync-queue'
import { triggerSync } from '../lib/sync-manager'
import type { SyncEntityType, SyncOperationType } from '../db/types'

interface OfflineMutationOptions<TData, TVariables> {
  entityType: SyncEntityType
  operationType: SyncOperationType
  getEntityId?: (variables: TVariables) => number | string
  invalidateKeys?: string[][]
  onSuccess?: (data: TData | null) => void
  onError?: (error: Error) => void
}

/**
 * Create a mutation that queues operations when offline
 */
export function useOfflineMutation<TData, TVariables extends Record<string, unknown>>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: OfflineMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient()
  const {
    entityType,
    operationType,
    getEntityId = () => 0,
    invalidateKeys = [],
    onSuccess,
    onError,
  } = options

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        const result = await mutationFn(variables)

        // Success - invalidate related queries
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key })
        }

        return result
      } catch (error) {
        // If offline, queue for later sync
        if (!navigator.onLine) {
          const entityId = getEntityId(variables)
          await enqueueOperation(operationType, entityType, entityId, variables)

          // Return null for optimistic UI
          return null as TData
        }

        // Re-throw if online (actual server error)
        throw error
      }
    },
    onSuccess: (data) => {
      // Trigger sync after successful mutation
      if (navigator.onLine) {
        triggerSync()
      }
      onSuccess?.(data)
    },
    onError: (error) => {
      onError?.(error)
    },
  })
}

/**
 * Convenience hook for create operations
 */
export function useOfflineCreate<TData, TVariables extends Record<string, unknown>>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  entityType: SyncEntityType,
  invalidateKeys?: string[][]
) {
  return useOfflineMutation(mutationFn, {
    entityType,
    operationType: 'CREATE',
    invalidateKeys,
  })
}

/**
 * Convenience hook for update operations
 */
export function useOfflineUpdate<TData, TVariables extends Record<string, unknown> & { id: number }>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  entityType: SyncEntityType,
  invalidateKeys?: string[][]
) {
  return useOfflineMutation(mutationFn, {
    entityType,
    operationType: 'UPDATE',
    getEntityId: (vars) => vars.id,
    invalidateKeys,
  })
}

/**
 * Convenience hook for delete operations
 */
export function useOfflineDelete<TData>(
  mutationFn: (id: number) => Promise<TData>,
  entityType: SyncEntityType,
  invalidateKeys?: string[][]
) {
  return useOfflineMutation(
    (variables: { id: number }) => mutationFn(variables.id),
    {
      entityType,
      operationType: 'DELETE',
      getEntityId: (vars) => vars.id,
      invalidateKeys,
    }
  )
}
