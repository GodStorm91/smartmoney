import { useQuery } from '@tanstack/react-query'
import { getCreditBalance, getCreditTransactions } from '@/services/credit-service'
import type { CreditBalance, TransactionHistory } from '@/types/credit'

/**
 * React Query hook for fetching credit balance
 * Auto-refreshes every 30 seconds to keep balance up-to-date
 *
 * @returns React Query result with credit balance data
 */
export function useCreditBalance() {
  return useQuery<CreditBalance>({
    queryKey: ['credits', 'balance'],
    queryFn: () => getCreditBalance(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds
  })
}

/**
 * React Query hook for fetching credit transaction history
 *
 * @param page - Page number (default: 1)
 * @param perPage - Items per page (default: 20)
 * @param type - Filter by transaction type (default: 'all')
 * @returns React Query result with transaction history
 */
export function useCreditTransactions(
  page: number = 1,
  perPage: number = 20,
  type: string = 'all'
) {
  return useQuery<TransactionHistory>({
    queryKey: ['credits', 'transactions', { page, perPage, type }],
    queryFn: () => getCreditTransactions(page, perPage, type),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
