import { useQuery } from '@tanstack/react-query'
import { fetchExchangeRates } from '@/services/exchange-rate-service'
import type { ExchangeRatesResponse } from '@/types'

/**
 * React Query hook for exchange rates
 *
 * Features:
 * - 24h stale time (rates update daily at 4 AM UTC)
 * - 48h cache time (offline access)
 * - No refetch on window focus (rates stable)
 *
 * @returns {Object} React Query result
 * @returns {ExchangeRatesResponse | undefined} data - Exchange rates data
 * @returns {boolean} isLoading - Loading state
 * @returns {Error | null} error - Error state
 */
export function useExchangeRates() {
  return useQuery<ExchangeRatesResponse>({
    queryKey: ['exchange-rates'],
    queryFn: fetchExchangeRates,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/**
 * Helper hook to get a specific currency rate
 *
 * @param currency - Currency code (e.g., 'USD', 'VND')
 * @returns Rate to JPY, or undefined if not loaded/found
 */
export function useExchangeRate(currency: string): number | undefined {
  const { data } = useExchangeRates()
  return data?.rates[currency]
}

/**
 * Helper hook to get all rates as Record
 *
 * @returns Rates object, or empty object if not loaded
 */
export function useRatesMap(): Record<string, number> {
  const { data } = useExchangeRates()
  return data?.rates || {}
}
