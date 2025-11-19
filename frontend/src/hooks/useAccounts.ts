import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAccounts,
  fetchAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} from '@/services/account-service'
import type { AccountCreate, AccountUpdate, AccountWithBalance } from '@/types'

/**
 * React Query hook for fetching all accounts
 *
 * @param includeInactive - Include inactive accounts in results
 * @returns React Query result with accounts data
 */
export function useAccounts(includeInactive = false) {
  return useQuery<AccountWithBalance[]>({
    queryKey: ['accounts', { includeInactive }],
    queryFn: () => fetchAccounts({ includeInactive }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * React Query hook for fetching a single account
 *
 * @param id - Account ID
 * @returns React Query result with account data
 */
export function useAccount(id: number) {
  return useQuery<AccountWithBalance>({
    queryKey: ['accounts', id],
    queryFn: () => fetchAccount(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  })
}

/**
 * React Query mutation hook for creating an account
 *
 * @returns Mutation hook with createAccount function
 */
export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AccountCreate) => createAccount(data),
    onSuccess: () => {
      // Invalidate accounts query to refetch
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

/**
 * React Query mutation hook for updating an account
 *
 * @returns Mutation hook with updateAccount function
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AccountUpdate }) =>
      updateAccount(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific account and list
      queryClient.invalidateQueries({ queryKey: ['accounts', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

/**
 * React Query mutation hook for deleting an account
 *
 * @returns Mutation hook with deleteAccount function
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: () => {
      // Invalidate accounts query to refetch
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
