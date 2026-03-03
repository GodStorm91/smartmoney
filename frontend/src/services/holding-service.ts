/**
 * Service for holdings/investments API calls
 */
import { apiClient } from './api-client'
import type {
  Holding,
  HoldingWithLots,
  HoldingCreate,
  HoldingUpdate,
  HoldingLot,
  LotCreate,
  PortfolioSummary,
} from '@/types/holding'

interface HoldingListResponse {
  holdings: Holding[]
  total: number
}

/**
 * Fetch all holdings for current user
 */
export async function fetchHoldings(activeOnly = true): Promise<Holding[]> {
  const params = new URLSearchParams()
  if (activeOnly) params.append('active_only', 'true')
  const res = await apiClient.get<HoldingListResponse>(`/api/holdings/?${params.toString()}`)
  return res.data.holdings
}

/**
 * Fetch a single holding with its lots
 */
export async function fetchHolding(id: number): Promise<HoldingWithLots> {
  const res = await apiClient.get<HoldingWithLots>(`/api/holdings/${id}`)
  return res.data
}

/**
 * Create a new holding
 */
export async function createHolding(data: HoldingCreate): Promise<Holding> {
  const res = await apiClient.post<Holding>('/api/holdings/', data)
  return res.data
}

/**
 * Update an existing holding
 */
export async function updateHolding(id: number, data: HoldingUpdate): Promise<Holding> {
  const res = await apiClient.patch<Holding>(`/api/holdings/${id}`, data)
  return res.data
}

/**
 * Delete a holding
 */
export async function deleteHolding(id: number): Promise<void> {
  await apiClient.delete(`/api/holdings/${id}`)
}

/**
 * Add a lot (buy/sell/dividend) to a holding
 */
export async function addLot(holdingId: number, data: LotCreate): Promise<HoldingLot> {
  const res = await apiClient.post<HoldingLot>(`/api/holdings/${holdingId}/lots`, data)
  return res.data
}

/**
 * Delete a lot from a holding
 */
export async function deleteLot(holdingId: number, lotId: number): Promise<void> {
  await apiClient.delete(`/api/holdings/${holdingId}/lots/${lotId}`)
}

/**
 * Update the current market price for a holding
 */
export async function updateHoldingPrice(
  id: number,
  price: number,
  date: string
): Promise<Holding> {
  const res = await apiClient.patch<Holding>(`/api/holdings/${id}/price`, { price, date })
  return res.data
}

/**
 * Fetch portfolio summary across all holdings
 */
export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await apiClient.get<PortfolioSummary>('/api/holdings/summary')
  return res.data
}
