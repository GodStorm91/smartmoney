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
 * @param amount - Number to format (in cents)
 * @param currency - Target currency code (JPY, USD, VND)
 * @param rates - Exchange rates from API
 * @param isNativeCurrency - If true, amount already in target currency (skip conversion)
 *                          If false, amount in JPY base currency (apply exchange rate)
 * @returns Formatted currency string
 *
 * @example
 * // Account balance (native currency)
 * formatCurrency(10000, 'VND', rates, true)  // "₫100"
 *
 * // Transaction amount (JPY-based)
 * formatCurrency(10000, 'VND', rates, false) // "₫1,600,000" (10000 JPY → VND)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'JPY',
  rates: Record<string, number> = DEFAULT_RATES,
  isNativeCurrency: boolean = false
): string {
  // Skip exchange rate conversion for amounts already in native currency
  const convertedAmount = isNativeCurrency
    ? amount  // Already in native currency cents
    : convertCurrency(amount, currency, rates)  // Convert from JPY base

  // Locale mapping
  const localeMap: Record<string, string> = {
    JPY: 'ja-JP',
    USD: 'en-US',
    VND: 'vi-VN',
  }
  const locale = localeMap[currency] || 'ja-JP'

  // Decimal places
  const fractionDigits = currency === 'USD' ? 2 : 0

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(convertedAmount / 100)  // Convert cents to units
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
 * @param amount - Number to format (in cents)
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
    ? amount  // Already in native currency cents
    : convertCurrency(amount, currency, rates)  // Convert from JPY base

  const localeMap: Record<string, string> = {
    JPY: 'ja-JP',
    USD: 'en-US',
    VND: 'vi-VN',
  }
  const locale = localeMap[currency] || 'ja-JP'
  const fractionDigits = currency === 'USD' ? 1 : 0

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(convertedAmount / 100)  // Convert cents to units
}
