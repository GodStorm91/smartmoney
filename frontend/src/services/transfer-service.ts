import { apiClient } from './api-client'
import type {
  ExchangeCreate,
  ExchangeResponse,
  Transfer,
  TransferCreate,
  TransferResponse,
} from '@/types/transfer'

/**
 * Create a transfer between accounts
 */
export async function createTransfer(data: TransferCreate): Promise<TransferResponse> {
  const response = await apiClient.post<TransferResponse>('/api/transfers/', data)
  return response.data
}

/**
 * Create a currency exchange with linked transactions
 */
export async function createExchange(data: ExchangeCreate): Promise<ExchangeResponse> {
  const response = await apiClient.post<ExchangeResponse>('/api/transfers/exchange', data)
  return response.data
}

/**
 * Delete a transfer and all associated transactions
 */
export async function deleteTransfer(transferId: string): Promise<void> {
  await apiClient.delete(`/api/transfers/${transferId}`)
}

/**
 * Fetch all transfers for the current user
 */
export async function fetchTransfers(): Promise<Transfer[]> {
  const response = await apiClient.get<Transfer[]>('/api/transfers/')
  return response.data
}
