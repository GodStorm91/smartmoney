/**
 * parseVoiceTransaction - Parse voice input into transaction data
 */

export interface ParsedTransaction {
  amount: number
  currency: 'JPY' | 'USD' | 'VND'
  description: string
}

/**
 * Parse voice input text into a transaction
 *
 * Supported patterns:
 * - "1500 セブンイレブン" → ¥1,500, description: セブンイレブン
 * - "1500 yen seven eleven" → ¥1,500, description: seven eleven
 * - "15 dollars coffee" → $15, description: coffee
 * - "50000 dong lunch" → ₫50,000, description: lunch
 */
export function parseVoiceTransaction(text: string): ParsedTransaction | null {
  if (!text || text.trim().length === 0) {
    return null
  }

  const normalizedText = text.trim()

  // 1. Extract amount (first number found, supports comma-separated)
  const amountMatch = normalizedText.match(/[\d,]+/)
  if (!amountMatch) {
    return null
  }

  const amountStr = amountMatch[0].replace(/,/g, '')
  const amount = parseInt(amountStr, 10)

  if (isNaN(amount) || amount <= 0) {
    return null
  }

  // 2. Detect currency
  let currency: 'JPY' | 'USD' | 'VND' = 'JPY'

  // Check for currency keywords
  const lowerText = normalizedText.toLowerCase()
  if (/dollar|dollars|usd|\$|ドル/.test(lowerText)) {
    currency = 'USD'
  } else if (/dong|vnd|đồng|ドン/.test(lowerText)) {
    currency = 'VND'
  } else if (/yen|円|¥|えん/.test(lowerText)) {
    currency = 'JPY'
  }

  // 3. Extract description (everything after amount, minus currency words)
  let description = normalizedText
    // Remove the amount
    .replace(/[\d,]+/, '')
    // Remove currency keywords
    .replace(/yen|円|¥|dollar|dollars|usd|\$|dong|vnd|đồng|ドル|ドン|えん/gi, '')
    // Clean up whitespace
    .trim()

  // If description is empty, use a generic one
  if (!description) {
    description = 'Voice entry'
  }

  return {
    amount,
    currency,
    description,
  }
}

/**
 * Format parsed transaction for display
 */
export function formatParsedTransaction(parsed: ParsedTransaction): string {
  const currencySymbols: Record<string, string> = {
    JPY: '¥',
    USD: '$',
    VND: '₫',
  }

  const symbol = currencySymbols[parsed.currency] || parsed.currency
  const formattedAmount = parsed.amount.toLocaleString()

  return `${symbol}${formattedAmount} - ${parsed.description}`
}
