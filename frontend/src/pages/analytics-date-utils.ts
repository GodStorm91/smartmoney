/**
 * Pure date-range helpers for the Analytics page.
 * Converts a PeriodType + selected month into concrete start/end strings.
 */
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { getCurrentMonthRange } from '@/utils/formatDate'
import type { PeriodType } from '@/components/analytics'

export function getDateRangeForPeriod(
  period: PeriodType,
  selectedMonth: Date
): { start: string; end: string } {
  const monthEnd = endOfMonth(selectedMonth)
  const end = format(monthEnd > new Date() ? new Date() : monthEnd, 'yyyy-MM-dd')

  switch (period) {
    case 'current-month':
      return { start: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'), end }
    case '3-months':
      return { start: format(subMonths(startOfMonth(selectedMonth), 2), 'yyyy-MM-dd'), end }
    case '6-months':
      return { start: format(subMonths(startOfMonth(selectedMonth), 5), 'yyyy-MM-dd'), end }
    case '1-year':
      return { start: format(subMonths(startOfMonth(selectedMonth), 11), 'yyyy-MM-dd'), end }
    default:
      return getCurrentMonthRange()
  }
}
