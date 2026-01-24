import { useTranslation } from 'react-i18next'
import { Plus, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusBadgeMini, getBudgetStatus } from './status-badge'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { BudgetAllocation, BudgetTrackingItem } from '@/types'

interface CategoryListPanelProps {
  allocations: BudgetAllocation[]
  trackingItems?: BudgetTrackingItem[]
  selectedCategory: string | null
  onSelectCategory: (category: string) => void
  isDraft?: boolean
  onAddCategory?: () => void
  className?: string
}

export function CategoryListPanel({
  allocations,
  trackingItems,
  selectedCategory,
  onSelectCategory,
  isDraft,
  onAddCategory,
  className
}: CategoryListPanelProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  const getTrackingItem = (category: string) =>
    trackingItems?.find(item => item.category === category)

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = index < allocations.length - 1 ? index + 1 : 0
      onSelectCategory(allocations[nextIndex].category)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = index > 0 ? index - 1 : allocations.length - 1
      onSelectCategory(allocations[prevIndex].category)
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Add Category Button (Draft Mode) */}
      {isDraft && onAddCategory && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={onAddCategory}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('budget.addCategory')}
          </Button>
        </div>
      )}

      {/* Category List */}
      <div
        className="flex-1 overflow-y-auto scrollbar-hide"
        role="listbox"
        aria-label={t('budget.allocations')}
      >
        {allocations.map((allocation, index) => {
          const tracking = getTrackingItem(allocation.category)
          const percentage = tracking?.percentage || 0
          const spent = tracking?.spent || 0
          const status = getBudgetStatus(percentage)
          const isSelected = selectedCategory === allocation.category

          return (
            <button
              key={allocation.category}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelectCategory(allocation.category)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3',
                'text-left transition-all',
                'hover:bg-gray-50 dark:hover:bg-gray-800',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500',
                isSelected && 'bg-green-50 dark:bg-green-900/20 border-l-3 border-green-500'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {allocation.category}
                  </span>
                  <StatusBadgeMini status={status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(spent)} / {formatCurrency(allocation.amount)}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {Math.round(percentage)}%
                  </span>
                </div>
              </div>
              <ChevronRight className={cn(
                'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform',
                isSelected && 'text-green-500'
              )} />
            </button>
          )
        })}

        {allocations.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {t('budget.noAllocations')}
          </div>
        )}
      </div>
    </div>
  )
}
