import { format, parseISO, isValid } from 'date-fns'
import { ja } from 'date-fns/locale'

/**
 * Format date string for Japanese locale
 * @param date - Date string or Date object
 * @param formatStr - Date format string (default: yyyy/MM/dd)
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, formatStr: string = 'yyyy/MM/dd'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(dateObj)) {
      return '---'
    }

    return format(dateObj, formatStr, { locale: ja })
  } catch {
    return '---'
  }
}

/**
 * Format date with Japanese locale full format
 * @param date - Date string or Date object
 * @returns Formatted date (e.g., "2025年11月17日")
 */
export function formatDateJP(date: string | Date): string {
  return formatDate(date, 'yyyy年M月d日')
}

/**
 * Format date with time
 * @param date - Date string or Date object
 * @returns Formatted datetime (e.g., "2025年11月17日 20:45")
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'yyyy年M月d日 HH:mm')
}

/**
 * Format month only
 * @param date - Date string or Date object
 * @returns Formatted month (e.g., "2025年11月")
 */
export function formatMonth(date: string | Date): string {
  return formatDate(date, 'yyyy年M月')
}

/**
 * Get current month in YYYY-MM format
 * @returns Current month string
 */
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

/**
 * Get date range for current month
 * @returns Object with start and end dates
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  return {
    start: `${year}-${month}-01`,
    end: format(new Date(year, now.getMonth() + 1, 0), 'yyyy-MM-dd'),
  }
}
