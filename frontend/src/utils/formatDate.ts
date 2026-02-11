import { format, parseISO, isValid } from 'date-fns'
import { ja, vi, enUS, type Locale } from 'date-fns/locale'
import i18n from '@/i18n/config'

const localeMap: Record<string, Locale> = {
  ja,
  vi,
  en: enUS,
}

/**
 * Get the current date-fns locale based on i18n language setting.
 * Exported so components using date-fns format() directly can pass { locale }.
 */
export function getDateLocale(): Locale {
  return localeMap[i18n.language] || enUS
}

/**
 * Get BCP 47 locale tag for use with toLocaleDateString() / Intl APIs.
 * Maps short i18n codes to full locale tags.
 */
export function getLocaleTag(): string {
  const lang = i18n.language
  if (lang === 'ja') return 'ja-JP'
  if (lang === 'vi') return 'vi-VN'
  return 'en-US'
}

/**
 * Format date string using the current i18n locale
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

    return format(dateObj, formatStr, { locale: getDateLocale() })
  } catch {
    return '---'
  }
}

/**
 * Format date in locale-aware full format
 * @param date - Date string or Date object
 * @returns Formatted date (e.g., "2025年11月17日" / "Nov 17, 2025" / "17 tháng 11, 2025")
 */
export function formatDateJP(date: string | Date): string {
  const lang = i18n.language
  if (lang === 'ja') return formatDate(date, 'yyyy年M月d日')
  if (lang === 'vi') return formatDate(date, 'dd/MM/yyyy')
  return formatDate(date, 'MMM d, yyyy')
}

/**
 * Format date with time in locale-aware format
 * @param date - Date string or Date object
 * @returns Formatted datetime
 */
export function formatDateTime(date: string | Date): string {
  const lang = i18n.language
  if (lang === 'ja') return formatDate(date, 'yyyy年M月d日 HH:mm')
  if (lang === 'vi') return formatDate(date, 'dd/MM/yyyy HH:mm')
  return formatDate(date, 'MMM d, yyyy HH:mm')
}

/**
 * Format month in locale-aware format
 * @param date - Date string or Date object
 * @returns Formatted month (e.g., "2025年11月" / "November 2025" / "Tháng 11, 2025")
 */
export function formatMonth(date: string | Date): string {
  const lang = i18n.language
  if (lang === 'ja') return formatDate(date, 'yyyy年M月')
  if (lang === 'vi') return formatDate(date, 'MMMM yyyy')
  return formatDate(date, 'MMMM yyyy')
}

/**
 * Format date for locale-aware date display in components (e.g., calendar headers)
 * @param date - Date or Date string
 * @returns Locale-aware full date string
 */
export function formatFullDate(date: string | Date): string {
  const lang = i18n.language
  if (lang === 'ja') return formatDate(date, 'yyyy年M月d日')
  if (lang === 'vi') return formatDate(date, 'dd MMMM yyyy')
  return formatDate(date, 'MMMM d, yyyy')
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

/**
 * Format date for section headers in locale-aware format
 * @param date - Date string or Date object
 * @returns Formatted date header (e.g., en: "Nov 17 (Mon)", ja: "11月17日 (月)", vi: "T2, 17 Thg 11")
 */
export function formatDateHeader(date: string | Date): string {
  const lang = i18n.language
  if (lang === 'ja') return formatDate(date, 'M月d日 (EEE)')
  if (lang === 'vi') return formatDate(date, 'EEE, d MMM')
  return formatDate(date, 'MMM d (EEE)')
}
