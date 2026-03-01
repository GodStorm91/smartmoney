import { apiClient } from './api-client'
import type { Analytics, DateRange, DailySpendingResponse, ForecastResponse, SpendingInsightsResponse } from '@/types'

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
 * Year-over-year response shape from GET /api/analytics/yoy
 */
export interface YoYMonth {
  month: number
  label: string
  current_expense: number | null
  previous_expense: number
  current_income: number | null
  previous_income: number
  expense_change_pct: number | null
  income_change_pct: number | null
}

export interface YoYResponse {
  current_year: number
  previous_year: number
  months: YoYMonth[]
  summary: {
    total_current_expense: number
    total_previous_expense: number
    total_current_income: number
    total_previous_income: number
    total_expense_change_pct: number | null
    total_income_change_pct: number | null
  }
}

/**
 * Fetch year-over-year spending/income comparison
 */
export async function fetchYearOverYear(): Promise<YoYResponse> {
  const response = await apiClient.get<YoYResponse>('/api/analytics/yoy')
  return response.data
}

/**
 * Fetch daily spending data for heatmap
 */
export async function fetchDailySpending(dateRange?: DateRange): Promise<DailySpendingResponse> {
  const params = new URLSearchParams()
  if (dateRange?.start) params.append('start_date', dateRange.start)
  if (dateRange?.end) params.append('end_date', dateRange.end)
  const response = await apiClient.get<DailySpendingResponse>(`/api/analytics/daily?${params.toString()}`)
  return response.data
}

/**
 * Fetch cash flow forecast (actual + projected months)
 */
export async function fetchForecast(months: number = 6): Promise<ForecastResponse> {
  const response = await apiClient.get<ForecastResponse>(`/api/analytics/forecast?months=${months}`)
  return response.data
}

export interface SpendingVelocityData {
  total_spent: number
  days_elapsed: number
  days_in_month: number
  daily_average: number
  projected_month_total: number
  days_remaining: number
  last_month_total: number
  velocity_change_pct: number
}

/**
 * Fetch current month spending velocity (daily burn rate)
 */
export async function fetchSpendingVelocity(): Promise<SpendingVelocityData> {
  const response = await apiClient.get<SpendingVelocityData>('/api/analytics/velocity')
  return response.data
}
