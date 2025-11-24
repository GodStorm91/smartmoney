/**
 * Format number with thousand separators
 * @param value - Number or string to format
 * @param decimalPlaces - Number of decimal places (0 for JPY/VND, 2 for USD)
 * @returns Formatted string with commas
 *
 * @example
 * formatNumberWithSeparators(500000, 0)  // "500,000"
 * formatNumberWithSeparators(5000.5, 2)  // "5,000.50"
 */
export function formatNumberWithSeparators(
  value: number | string,
  decimalPlaces: number = 0
): string {
  if (!value && value !== 0) return ''

  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return ''

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(numValue)
}

/**
 * Parse formatted number string to number
 * Removes thousand separators and converts to number
 * @param value - Formatted string with commas
 * @returns Number value
 *
 * @example
 * parseFormattedNumber("500,000")    // 500000
 * parseFormattedNumber("5,000.50")   // 5000.5
 */
export function parseFormattedNumber(value: string): number {
  if (!value) return 0

  // Remove thousand separators (commas)
  const cleaned = value.replace(/,/g, '')
  const parsed = parseFloat(cleaned)

  return isNaN(parsed) ? 0 : parsed
}

/**
 * Get currency symbol for display
 * @param currency - Currency code
 * @returns Currency symbol or code
 *
 * @example
 * getCurrencySymbol('JPY')  // "¥"
 * getCurrencySymbol('USD')  // "$"
 * getCurrencySymbol('VND')  // "₫"
 */
export function getCurrencySymbol(currency: string): string {
  const symbolMap: Record<string, string> = {
    JPY: '¥',
    USD: '$',
    VND: '₫',
    EUR: '€',
    GBP: '£',
  }
  return symbolMap[currency] || currency
}

/**
 * Get currency position (prefix or suffix)
 * @param currency - Currency code
 * @returns 'prefix' or 'suffix'
 *
 * @example
 * getCurrencyPosition('JPY')  // "prefix"
 * getCurrencyPosition('USD')  // "prefix"
 * getCurrencyPosition('VND')  // "suffix"
 */
export function getCurrencyPosition(currency: string): 'prefix' | 'suffix' {
  const suffixCurrencies = ['VND']
  return suffixCurrencies.includes(currency) ? 'suffix' : 'prefix'
}

/**
 * Get decimal places for currency
 * @param currency - Currency code
 * @returns Number of decimal places
 */
export function getCurrencyDecimals(currency: string): number {
  const decimalMap: Record<string, number> = {
    JPY: 0,
    VND: 0,
    KRW: 0,
    USD: 2,
    EUR: 2,
    GBP: 2,
  }
  return decimalMap[currency] ?? 0
}
