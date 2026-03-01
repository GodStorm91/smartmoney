import { apiClient } from './api-client'
import type { MonthlyUsageReportData, AIReportSummary } from '@/types'

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

/**
 * Generate AI summary for a monthly report (POST — costs credits)
 */
export async function generateAISummary(
  year: number,
  month: number,
  language?: string,
  forceRegenerate?: boolean
): Promise<AIReportSummary> {
  const response = await apiClient.post<AIReportSummary>(
    `/api/reports/monthly/${year}/${month}/ai-summary`,
    null,
    { params: { language, force_regenerate: forceRegenerate } }
  )
  return response.data
}

/**
 * Fetch cached AI summary (GET — no credit cost, returns null if not cached)
 */
export async function fetchAISummary(
  year: number,
  month: number,
  language?: string
): Promise<AIReportSummary | null> {
  try {
    const response = await apiClient.get<AIReportSummary>(
      `/api/reports/monthly/${year}/${month}/ai-summary`,
      { params: { language } }
    )
    return response.data
  } catch {
    return null
  }
}
