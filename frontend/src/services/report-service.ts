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
