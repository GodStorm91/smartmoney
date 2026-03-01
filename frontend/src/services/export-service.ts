import { apiClient } from './api-client'

interface ExportLinkResponse {
  url: string
  expiresAt: string
  expiresInMinutes: number
}

/**
 * Generate a temporary link for iOS app to download export data.
 */
export async function generateExportLink(): Promise<ExportLinkResponse> {
  const response = await apiClient.post<ExportLinkResponse>('/api/export/ios/link')
  return response.data
}

/**
 * Export user data as JSON for iOS app import.
 * Downloads the file automatically via browser.
 */
/**
 * Export transactions as CSV from server with optional date filters.
 */
export async function exportCsvFromServer(params?: {
  startDate?: string
  endDate?: string
}): Promise<void> {
  const queryParams = new URLSearchParams()
  if (params?.startDate) queryParams.set('start_date', params.startDate)
  if (params?.endDate) queryParams.set('end_date', params.endDate)

  const url = `/api/export/csv${queryParams.toString() ? `?${queryParams}` : ''}`
  const response = await apiClient.get(url, { responseType: 'blob' })

  const contentDisposition = response.headers['content-disposition']
  let filename = `smartmoney-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/)
    if (match?.[1]) filename = match[1]
  }

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
}

/**
 * Export user data as JSON for iOS app import.
 * Downloads the file automatically via browser.
 */
export async function exportForIOS(): Promise<void> {
  const response = await apiClient.get('/api/export/ios', {
    responseType: 'blob',
  })

  // Extract filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition']
  let filename = `smartmoney-export-${new Date().toISOString().slice(0, 10)}.json`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/)
    if (match?.[1]) {
      filename = match[1]
    }
  }

  // Create blob and trigger download
  const blob = new Blob([response.data], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
