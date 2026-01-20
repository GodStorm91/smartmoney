import { apiClient } from './api-client'
import type { Analytics, DateRange, ForecastResponse, SpendingInsightsResponse } from '@/types'

/**
 * Fetch analytics data for date range
 */
export async function fetchAnalytics(dateRange?: DateRange): Promise<Analytics> {
  const params = new URLSearchParams()

  if (dateRange?.start) params.append('start_date', dateRange.start)
  if (dateRange?.end) params.append('end_date', dateRange.end)

  const response = await apiClient.get<Analytics>(`/api/analytics?${params.toString()}`)
  return response.data
}

/**
 * Fetch monthly trends for chart (last 12 months)
 */
export async function fetchMonthlyTrends(months: number = 12): Promise<Analytics['monthly_trends']> {
  const response = await apiClient.get<Analytics['monthly_trends']>(`/api/analytics/monthly?months=${months}`)
  return response.data
}

/**
 * Fetch category breakdown
 */
export async function fetchCategoryBreakdown(dateRange?: DateRange): Promise<Analytics['category_breakdown']> {
  const params = new URLSearchParams()

  if (dateRange?.start) params.append('start_date', dateRange.start)
  if (dateRange?.end) params.append('end_date', dateRange.end)

  const response = await apiClient.get<Analytics['category_breakdown']>(`/api/analytics/categories?${params.toString()}`)
  return response.data
}

/**
 * Fetch dashboard summary data
 */
export async function fetchDashboardSummary(month?: string): Promise<{
  income: number
  expense: number
  net: number
  income_change: number
  expense_change: number
  net_change: number
  transaction_count: number
}> {
  const params = month ? `?month=${month}` : ''
  const response = await apiClient.get(`/api/dashboard/summary${params}`)
  return response.data
}

/**
 * Fetch spending insights
 */
export async function fetchSpendingInsights(): Promise<SpendingInsightsResponse> {
  const response = await apiClient.get<SpendingInsightsResponse>('/api/analytics/insights')
  return response.data
}

/**
 * Fetch cash flow forecast (actual + projected months)
 */
export async function fetchForecast(months: number = 6): Promise<ForecastResponse> {
  const response = await apiClient.get<ForecastResponse>(`/api/analytics/forecast?months=${months}`)
  return response.data
}
