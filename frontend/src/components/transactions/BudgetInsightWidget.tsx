import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getBudgetTracking } from '@/services/budget-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'

interface BudgetInsightWidgetProps {
  /** Parent category name that maps to budget allocation */
  parentCategory: string
  /** Current transaction amount (positive integer) */
  transactionAmount: number
  /** Whether this is an expense transaction */
  isExpense: boolean
}

export function BudgetInsightWidget({
  parentCategory,
  transactionAmount,
  isExpense,
}: BudgetInsightWidgetProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const { data: tracking } = useQuery({
    queryKey: ['budget', 'tracking', currentMonth],
    queryFn: () => getBudgetTracking(currentMonth),
    staleTime: 2 * 60 * 1000,
    retry: false,
  })

  const fmt = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  // Don't show for income transactions
  if (!isExpense) return null

  // Find tracking item for the parent category
  const trackingItem = tracking?.categories?.find(
    (c) => c.category === parentCategory
  )

  // No budget allocation for this category
  if (!trackingItem) return null

  const { spent, budgeted } = trackingItem
  const spentPercent = budgeted > 0 ? (spent / budgeted) * 100 : 0

  // Calculate what happens if this transaction is added
  const afterSpent = spent + transactionAmount
  const afterPercent = budgeted > 0 ? (afterSpent / budgeted) * 100 : 0
  const willExceed = afterSpent > budgeted

  const getBarColor = () => {
    if (afterPercent >= 100) return 'bg-red-500'
    if (afterPercent >= 80) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const getTextColor = () => {
    if (willExceed) return 'text-red-600 dark:text-red-400'
    if (afterPercent >= 80) return 'text-amber-600 dark:text-amber-400'
    return 'text-green-600 dark:text-green-400'
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
      {/* Header: category name + remaining */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
          {t('budget.insight.countsToward', { category: parentCategory })}
        </span>
        <span className={cn('text-xs font-semibold whitespace-nowrap', getTextColor())}>
          {willExceed
            ? t('budget.insight.over', { amount: fmt(afterSpent - budgeted) })
            : t('budget.insight.left', { amount: fmt(budgeted - afterSpent) })}
        </span>
      </div>

      {/* Compact progress bar */}
      <div className="mt-1.5">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* Current spent (solid) */}
          <div className="h-full rounded-full relative overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', getBarColor())}
              style={{ width: `${Math.min(afterPercent, 100)}%` }}
            />
            {/* Show the "new" portion as a striped overlay */}
            {transactionAmount > 0 && (
              <div
                className="absolute top-0 h-full opacity-50 rounded-r-full"
                style={{
                  left: `${Math.min(spentPercent, 100)}%`,
                  width: `${Math.min(afterPercent - spentPercent, 100 - Math.min(spentPercent, 100))}%`,
                  background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Spent / budgeted text */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        {t('budget.budgetContext.progress', { spent: fmt(spent), budgeted: fmt(budgeted) })}
        {transactionAmount > 0 && (
          <span className={cn('ml-1', getTextColor())}>
            → {fmt(afterSpent)}
          </span>
        )}
      </p>

      {/* Warning if will exceed */}
      {willExceed && transactionAmount > 0 && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">
          {t('budget.insight.willExceed')}
        </p>
      )}
    </div>
  )
}
