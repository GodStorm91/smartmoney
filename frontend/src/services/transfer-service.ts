import { apiClient } from './api-client'
import type { TransferCreate, TransferResponse, Transfer } from '@/types/transfer'

/**
 * Create a transfer between accounts
 */
export async function createTransfer(data: TransferCreate): Promise<TransferResponse> {
  const response = await apiClient.post<TransferResponse>('/api/transfers/', data)
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
