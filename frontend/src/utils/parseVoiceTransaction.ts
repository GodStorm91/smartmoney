/**
 * parseVoiceTransaction - Parse voice input into transaction data
 */

export interface ParsedTransaction {
  amount: number
  currency: 'JPY' | 'USD' | 'VND'
  description: string
  suggestedCategoryId?: string // Auto-detected category
}

// Keyword to category mapping (Japanese + English)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    // Japanese
    'ご飯', 'ごはん', 'ランチ', 'ディナー', '昼食', '夕食', '朝食', '弁当',
    'コーヒー', 'カフェ', 'スタバ', 'マック', 'マクドナルド', 'すき家', '吉野家',
    'ラーメン', '寿司', 'すし', 'うどん', 'そば', 'カレー', 'パン', 'ケーキ',
    'セブン', 'ファミマ', 'ローソン', 'コンビニ', 'スーパー',
    // English & Romaji
    'coffee', 'cafe', 'lunch', 'dinner', 'breakfast', 'food', 'restaurant',
    'starbucks', 'mcdonalds', 'ramen', 'sushi', 'curry', 'bread', 'cake',
    'konbini', 'supermarket', 'gohan', 'ko-hi-', 'kohi',
  ],
  transport: [
    // Japanese
    '電車', 'でんしゃ', 'バス', 'タクシー', '地下鉄', 'JR', '新幹線',
    'ガソリン', '駐車場', 'Suica', 'PASMO', 'パスモ', 'スイカ',
    // English
    'train', 'bus', 'taxi', 'subway', 'gas', 'parking', 'uber', 'lyft',
  ],
  shopping: [
    // Japanese
    '買い物', 'ショッピング', '服', 'ふく', '靴', 'くつ', 'アマゾン', '楽天',
    '雑貨', 'ユニクロ', 'GU', '無印',
    // English
    'shopping', 'clothes', 'shoes', 'amazon', 'uniqlo', 'muji',
  ],
  entertainment: [
    // Japanese
    '映画', 'えいが', 'ゲーム', 'カラオケ', 'ボウリング', '本', 'ほん',
    'Netflix', 'ネットフリックス', 'Spotify', 'スポティファイ',
    // English
    'movie', 'game', 'karaoke', 'bowling', 'book', 'netflix', 'spotify',
  ],
  utilities: [
    // Japanese
    '電気', 'でんき', 'ガス', '水道', 'すいどう', 'インターネット', 'Wi-Fi',
    // English
    'electric', 'electricity', 'water', 'internet', 'wifi',
  ],
  communication: [
    // Japanese
    '携帯', 'けいたい', 'スマホ', '電話', 'でんわ',
    // English
    'phone', 'mobile', 'cell',
  ],
  health: [
    // Japanese
    '病院', 'びょういん', '薬', 'くすり', '医者', 'いしゃ', '歯医者',
    'ジム', 'フィットネス',
    // English
    'hospital', 'medicine', 'doctor', 'dentist', 'gym', 'fitness',
  ],
  housing: [
    // Japanese
    '家賃', 'やちん', '光熱費',
    // English
    'rent', 'mortgage',
  ],
}

/**
 * Detect category from description text
 */
function detectCategory(text: string): string | undefined {
  const lowerText = text.toLowerCase()

  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return categoryId
      }
    }
  }

  return undefined
}

/**
 * Parse voice input text into a transaction
 *
 * Supported patterns:
 * - "1500 セブンイレブン" → ¥1,500, description: セブンイレブン, category: food
 * - "1500 yen seven eleven" → ¥1,500, description: seven eleven, category: food
 * - "15 dollars coffee" → $15, description: coffee, category: food
 * - "50000 dong lunch" → ₫50,000, description: lunch, category: food
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

  // Detect category from the full text (more context for matching)
  const suggestedCategoryId = detectCategory(normalizedText)

  return {
    amount,
    currency,
    description,
    suggestedCategoryId,
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
