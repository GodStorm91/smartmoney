/**
 * Format number as Japanese Yen currency
 * @param amount - Number to format
 * @returns Formatted currency string (e.g., "¥1,234,567")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format number with sign prefix for income/expense
 * @param amount - Number to format
 * @param type - Transaction type
 * @returns Formatted currency with +/- sign
 */
export function formatCurrencySigned(amount: number, type?: 'income' | 'expense'): string {
  const formatted = formatCurrency(Math.abs(amount))

  if (type === 'income' || amount > 0) {
    return `+${formatted}`
  } else if (type === 'expense' || amount < 0) {
    return `-${formatted}`
  }

  return formatted
}

/**
 * Format number as compact notation (e.g., 1.2M)
 * @param amount - Number to format
 * @returns Compact formatted string
 */
export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount)
}
