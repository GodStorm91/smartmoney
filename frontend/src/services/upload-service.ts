import { apiClient } from './api-client'
import type { UploadResult, BackendUploadResponse } from '@/types'

/**
 * Upload CSV file
 */
export async function uploadCSV(file: File, accountId?: number): Promise<BackendUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const params = accountId ? `?account_id=${accountId}` : ''
  const response = await apiClient.post<BackendUploadResponse>(`/api/upload/csv${params}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

/**
 * Upload PayPay screenshot image for OCR processing
 */
export async function uploadPayPayImage(file: File): Promise<BackendUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<BackendUploadResponse>('/api/upload/paypay', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

/**
 * Fetch upload history
 */
export async function fetchUploadHistory(): Promise<UploadResult[]> {
  const response = await apiClient.get<UploadResult[]>('/api/upload/history')
  return response.data
}
