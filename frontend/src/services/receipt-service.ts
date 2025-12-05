/**
 * Receipt scanning API service
 */
import { apiClient } from './api-client'

export interface ReceiptData {
  amount: number | null
  date: string | null
  merchant: string | null
  category: string | null
  confidence: {
    amount: number
    date: number
    merchant: number
  }
  warnings: string[]
}

export interface ScanReceiptRequest {
  image: string // Base64 encoded (with or without data URL prefix)
  media_type?: string
}

export interface ScanReceiptResponse {
  success: boolean
  data: ReceiptData
}

/**
 * Scan receipt image and extract transaction data
 * @param request - Image data to scan
 * @returns Extracted receipt data
 */
export async function scanReceipt(request: ScanReceiptRequest): Promise<ScanReceiptResponse> {
  const response = await apiClient.post<ScanReceiptResponse>('/api/receipts/scan', request)
  return response.data
}
