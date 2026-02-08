import { apiClient } from './api-client'
import type { MonthlyUsageReportData } from '@/types'

/**
 * Fetch monthly usage report data
 */
export async function fetchMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyUsageReportData> {
  const response = await apiClient.get<MonthlyUsageReportData>(
    `/api/reports/monthly-usage/${year}/${month}`
  )
  return response.data
}

/**
 * Download monthly usage report as PDF blob
 */
export async function downloadMonthlyReportPDF(
  year: number,
  month: number
): Promise<Blob> {
  const response = await apiClient.get(
    `/api/reports/monthly-usage/${year}/${month}/pdf`,
    { responseType: 'blob' }
  )
  return response.data
}
