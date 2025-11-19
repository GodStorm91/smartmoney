import { apiClient } from './api-client'
import type { ExchangeRatesResponse } from '@/types'

/**
 * Fetch exchange rates from backend
 * Rates are cached in database, updated daily at 4 AM UTC
 */
export async function fetchExchangeRates(): Promise<ExchangeRatesResponse> {
  const response = await apiClient.get<ExchangeRatesResponse>('/api/exchange-rates')
  return response.data
}
