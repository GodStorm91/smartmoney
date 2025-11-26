import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import type { CategoryBreakdown } from '@/types'

interface CategoryBreakdownListProps {
  categories: CategoryBreakdown[]
  maxItems?: number
}

const categoryEmojis: Record<string, string> = {
  '食費': '🍜',
  '住宅': '🏠',
  'こども・教育': '👶',
  '交通': '🚗',
  '医療': '🏥',
  '娯楽': '🎮',
  '衣服': '👔',
  'その他': '📦',
}

export function CategoryBreakdownList({ categories, maxItems }: CategoryBreakdownListProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const displayCategories = maxItems ? categories.slice(0, maxItems) : categories

  return (
    <div className="space-y-4">
      {displayCategories.map((category, index) => (
        <div key={index}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">
                {category.emoji || categoryEmojis[category.category] || '📊'}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category.category}</span>
            </div>
            <span className="text-sm font-semibold font-numbers text-gray-900 dark:text-gray-100">
              {formatCurrencyPrivacy(category.amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)}
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${category.percentage}%` }}
              role="progressbar"
              aria-valuenow={category.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${category.category}: ${category.percentage}%`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
