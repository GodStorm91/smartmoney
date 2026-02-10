// Currency symbols map
export const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  VND: '₫',
}

// Format number with thousand separators (supports negative and decimals)
export function formatWithCommas(value: string): string {
  const isNegative = value.startsWith('-')
  const num = value.replace(/[^\d.]/g, '')
  if (!num) return ''
  const parts = num.split('.')
  parts[0] = parseInt(parts[0]).toLocaleString()
  return (isNegative ? '-' : '') + parts.join('.')
}

// Parse formatted number back to raw value (preserves negative)
export function parseFormattedNumber(value: string): string {
  const isNegative = value.startsWith('-')
  const num = value.replace(/[^\d.]/g, '')
  return (isNegative ? '-' : '') + num
}
