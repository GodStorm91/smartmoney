/**
 * Default exchange rates (fallback if API not loaded)
 * Matches seed data from backend migration
 */
const DEFAULT_RATES: Record<string, number> = {
  JPY: 1.0,
  USD: 0.00667,
  VND: 160.0,
}

/**
 * Currency decimal places configuration
 * Zero-decimal currencies (JPY, VND, KRW) have no sub-units
 * Decimal currencies (USD, EUR) have cents/sub-units
 */
export const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0,  // Japanese Yen - no sen/rin in modern use
  VND: 0,  // Vietnamese Dong - no decimal places
  KRW: 0,  // Korean Won - no decimal places
  USD: 2,  // US Dollar - cents (1/100)
  EUR: 2,  // Euro - cents (1/100)
}

/**
 * Convert amount from JPY to target currency
 * @param amountInJPY - Amount in JPY (base currency in database)
 * @param targetCurrency - Target currency code
 * @param rates - Exchange rates (currency -> rate_to_jpy)
 * @returns Converted amount
 */
function convertCurrency(
  amountInJPY: number,
  targetCurrency: string,
  rates: Record<string, number>
): number {
  const rate = rates[targetCurrency] ?? DEFAULT_RATES[targetCurrency] ?? 1.0
  return amountInJPY * rate
}

/**
 * Format number as currency
 * @param amount - Number to format (integer stored in database)
 * @param currency - Target currency code (JPY, USD, VND)
 * @param rates - Exchange rates from API
 * @param isNativeCurrency - If true, amount already in target currency (skip conversion)
 *                          If false, amount in JPY base currency (apply exchange rate)
 * @returns Formatted currency string
 *
 * @example
 * // JPY (zero-decimal currency, stored as-is)
 * formatCurrency(823935, 'JPY', rates, true)  // "¥823,935"
 *
 * // USD (decimal currency, stored in cents)
 * formatCurrency(10000, 'USD', rates, true)  // "$100.00"
 *
 * // Transaction amount (JPY-based conversion)
 * formatCurrency(823935, 'VND', rates, false) // "₫131,829,600" (823935 JPY × 160)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'JPY',
  rates: Record<string, number> = DEFAULT_RATES,
  isNativeCurrency: boolean = false
): string {
  // Skip exchange rate conversion for amounts already in native currency
  const convertedAmount = isNativeCurrency
    ? amount  // Already in native currency
    : convertCurrency(amount, currency, rates)  // Convert from JPY base

  // Get decimal places for this currency
  const decimalPlaces = CURRENCY_DECIMALS[currency] ?? 0

  // Calculate divisor: 10^decimalPlaces
  // JPY/VND (0 decimals): divisor = 1 (no division)
  // USD/EUR (2 decimals): divisor = 100 (convert cents to dollars)
  const divisor = Math.pow(10, decimalPlaces)

  // Locale mapping
  const localeMap: Record<string, string> = {
    JPY: 'ja-JP',
    USD: 'en-US',
    VND: 'vi-VN',
  }
  const locale = localeMap[currency] || 'ja-JP'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(convertedAmount / divisor)
}

/**
 * Format number with sign prefix for income/expense
 * @param amount - Number to format (in cents)
 * @param type - Transaction type
 * @param currency - Target currency code
 * @param rates - Exchange rates from API
 * @param isNativeCurrency - If true, amount already in target currency (skip conversion)
 * @returns Formatted currency with +/- sign
 */
export function formatCurrencySigned(
  amount: number,
  type?: 'income' | 'expense',
  currency: string = 'JPY',
  rates: Record<string, number> = DEFAULT_RATES,
  isNativeCurrency: boolean = false
): string {
  const formatted = formatCurrency(Math.abs(amount), currency, rates, isNativeCurrency)

  if (type === 'income' || amount > 0) {
    return `+${formatted}`
  } else if (type === 'expense' || amount < 0) {
    return `-${formatted}`
  }

  return formatted
}

/**
 * Format number as compact notation
 * @param amount - Number to format (integer stored in database)
 * @param currency - Target currency code
 * @param rates - Exchange rates from API
 * @param isNativeCurrency - If true, amount already in target currency (skip conversion)
 * @returns Compact formatted string
 */
export function formatCurrencyCompact(
  amount: number,
  currency: string = 'JPY',
  rates: Record<string, number> = DEFAULT_RATES,
  isNativeCurrency: boolean = false
): string {
  const convertedAmount = isNativeCurrency
    ? amount  // Already in native currency
    : convertCurrency(amount, currency, rates)  // Convert from JPY base

  // Get decimal places for this currency
  const decimalPlaces = CURRENCY_DECIMALS[currency] ?? 0
  const divisor = Math.pow(10, decimalPlaces)

  const localeMap: Record<string, string> = {
    JPY: 'ja-JP',
    USD: 'en-US',
    VND: 'vi-VN',
  }
  const locale = localeMap[currency] || 'ja-JP'
  const compactFractionDigits = decimalPlaces > 0 ? 1 : 0

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: compactFractionDigits,
  }).format(convertedAmount / divisor)
}

/**
 * Mask currency value for privacy mode
 * @param currency - Currency code to determine symbol
 * @returns Masked value with currency symbol
 */
export function maskCurrencyValue(currency: string = 'JPY'): string {
  const symbolMap: Record<string, string> = {
    JPY: '¥***',
    USD: '$***',
    VND: '***₫',
  }
  return symbolMap[currency] || '***'
}

/**
 * Format currency with privacy mode support
 * @param amount - Number to format
 * @param currency - Currency code
 * @param rates - Exchange rates
 * @param isNativeCurrency - If amount is already in target currency
 * @param isPrivacyMode - If true, returns masked value
 * @returns Formatted or masked currency string
 */
export function formatCurrencyPrivacy(
  amount: number,
  currency: string = 'JPY',
  rates: Record<string, number> = DEFAULT_RATES,
  isNativeCurrency: boolean = false,
  isPrivacyMode: boolean = false
): string {
  if (isPrivacyMode) {
    return maskCurrencyValue(currency)
  }
  return formatCurrency(amount, currency, rates, isNativeCurrency)
}

/**
 * Format signed currency with privacy mode support
 */
export function formatCurrencySignedPrivacy(
  amount: number,
  type?: 'income' | 'expense',
  currency: string = 'JPY',
  rates: Record<string, number> = DEFAULT_RATES,
  isNativeCurrency: boolean = false,
  isPrivacyMode: boolean = false
): string {
  if (isPrivacyMode) {
    const masked = maskCurrencyValue(currency)
    if (type === 'income' || amount > 0) {
      return `+${masked}`
    } else if (type === 'expense' || amount < 0) {
      return `-${masked}`
    }
    return masked
  }
  return formatCurrencySigned(amount, type, currency, rates, isNativeCurrency)
}

/**
 * Format compact currency with privacy mode support
 */
export function formatCurrencyCompactPrivacy(
  amount: number,
  currency: string = 'JPY',
  rates: Record<string, number> = DEFAULT_RATES,
  isNativeCurrency: boolean = false,
  isPrivacyMode: boolean = false
): string {
  if (isPrivacyMode) {
    return maskCurrencyValue(currency)
  }
  return formatCurrencyCompact(amount, currency, rates, isNativeCurrency)
}

/**
 * Convert display amount to storage format
 * For zero-decimal currencies (JPY, VND, KRW): stored as-is
 * For decimal currencies (USD, EUR): stored in cents/sub-units
 * @param amount - Display amount (already formatted by user)
 * @param currency - Currency code
 * @returns Storage amount (integer for storage)
 */
export function toStorageAmount(amount: number, currency: string): number {
  const decimals = CURRENCY_DECIMALS[currency] ?? 0
  return Math.round(amount * Math.pow(10, decimals))
}
