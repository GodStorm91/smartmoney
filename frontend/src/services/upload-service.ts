import { apiClient } from './api-client'
import type { UploadResult } from '@/types'

/**
 * Upload CSV file
 */
export async function uploadCSV(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<UploadResult>('/api/upload/csv', formData, {
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
