import { apiClient } from './api-client'

interface UploadResponse {
  receipt_url: string
}

/**
 * Receipt data extracted by OCR scanning
 */
export interface ReceiptData {
  amount: number | null
  date: string | null
  merchant: string | null
  category: string | null
  confidence: {
    amount?: number
    date?: number
    merchant?: number
  }
  warnings: string[]
}

interface ScanResponse {
  success: boolean
  data: ReceiptData
}

interface ScanRequest {
  image: string
  media_type?: string
}

/**
 * Scan receipt image with AI OCR
 * @param request - Base64 encoded image
 * @returns Extracted receipt data
 */
export async function scanReceipt(request: ScanRequest): Promise<ScanResponse> {
  const response = await apiClient.post<ScanResponse>('/api/receipts/scan', request)
  return response.data
}

/**
 * Upload receipt image
 * @param file - Image file to upload
 * @returns URL path to stored receipt
 */
export async function uploadReceipt(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<UploadResponse>(
    '/api/receipts/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )

  return response.data.receipt_url
}

/**
 * Get full URL for receipt
 * In production, this returns the absolute URL
 */
export function getReceiptUrl(path: string | null | undefined): string | null {
  if (!path) return null
  // Path is already absolute from server (e.g., /uploads/receipts/1/uuid.jpg)
  return path
}
