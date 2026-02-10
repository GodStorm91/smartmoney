import { useTranslation } from 'react-i18next'
import { Check, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { CategorySuggestion } from '@/services/ai-categorization-service'

interface AiCategorizeReviewRowProps {
  suggestion: CategorySuggestion
  isSelected: boolean
  editedCategory: string
  categories: Array<{ value: string; label: string }>
  onToggle: (id: number) => void
  onCategoryChange: (id: number, category: string) => void
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const { t } = useTranslation('common')
  const pct = Math.round(confidence * 100)
  const variant = confidence >= 0.8 ? 'success' : confidence >= 0.6 ? 'warning' : 'error'
  return (
    <Badge variant={variant} className="text-[10px] px-1.5 py-0.5">
      {pct}% {t('ai.confidence')}
    </Badge>
  )
}

export function AiCategorizeReviewRow({
  suggestion,
  isSelected,
  editedCategory,
  categories,
  onToggle,
  onCategoryChange,
}: AiCategorizeReviewRowProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { t } = useTranslation('common')

  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
        'cursor-pointer select-none',
        isSelected
          ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-900/20 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
      onClick={() => onToggle(suggestion.transaction_id)}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle(suggestion.transaction_id)
        }
      }}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
          isSelected
            ? 'bg-primary-500 border-primary-500 text-white'
            : 'border-gray-300 dark:border-gray-600 group-hover:border-primary-400'
        )}
      >
        {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {suggestion.description}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatCurrency(Math.abs(suggestion.amount), currency, exchangeRates?.rates || {}, false)}
            </p>
          </div>
          <ConfidenceBadge confidence={suggestion.confidence} />
        </div>

        {/* Category selector */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            {suggestion.current_category}
          </span>
          <span className="text-xs text-gray-400" aria-hidden="true">&rarr;</span>
          <div className="relative flex-1 max-w-[180px]">
            <select
              value={editedCategory}
              onChange={(e) => {
                e.stopPropagation()
                onCategoryChange(suggestion.transaction_id, e.target.value)
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-full text-xs py-1 pl-2 pr-7 rounded-lg border appearance-none',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                'border-gray-200 dark:border-gray-600',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'transition-colors duration-150'
              )}
              aria-label={t('budget.aiCategorize.selectCategory')}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          {suggestion.is_new_category && (
            <Badge variant="info" className="text-[10px] px-1.5 py-0.5">
              {t('ai.newCategory')}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
