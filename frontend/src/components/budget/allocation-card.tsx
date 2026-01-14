import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TransactionSection } from './transaction-section'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { BudgetAllocation, BudgetTrackingItem } from '@/types'

interface AllocationCardProps {
  allocation: BudgetAllocation
  trackingItem?: BudgetTrackingItem
  totalBudget: number
  month: string
  isExpanded: boolean
  onToggleExpand: (category: string) => void
  onOpenDetail: (category: string) => void
  className?: string
}

export function AllocationCard({
  allocation,
  trackingItem,
  totalBudget,
  month,
  isExpanded,
  onToggleExpand,
  onOpenDetail,
  className
}: AllocationCardProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  const spent = trackingItem?.spent || 0
  const budgeted = trackingItem?.budgeted || allocation.amount
  const remaining = budgeted - spent
  const percentOfTotal = totalBudget > 0 ? (allocation.amount / totalBudget) * 100 : 0
  const spentPercent = budgeted > 0 ? (spent / budgeted) * 100 : 0

  const hasWarning = trackingItem && (trackingItem.status === 'red' || trackingItem.status === 'orange')

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isExpanded && 'border-blue-300 dark:border-blue-700',
        className
      )}
    >
      {/* Card Header - Clickable */}
      <button
        onClick={() => onToggleExpand(allocation.category)}
        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {allocation.category}
            </h4>
            {hasWarning && (
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
              {formatCurrency(allocation.amount)}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Allocation Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                percentOfTotal > 100 ? 'bg-red-500' :
                percentOfTotal > 90 ? 'bg-amber-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(100, percentOfTotal)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {percentOfTotal.toFixed(0)}%
          </span>
        </div>
      </button>

      {/* Tracking Section - Always visible */}
      {trackingItem && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {t('budget.spentOfBudgeted', { budgeted: formatCurrency(budgeted) })}
            </span>
            <span className={cn(
              'font-medium',
              remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {remaining >= 0 ? formatCurrency(remaining) : `-${formatCurrency(Math.abs(remaining))}`}
            </span>
          </div>

          {/* Spent Progress Bar */}
          <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                trackingItem.status === 'red' ? 'bg-red-500' :
                trackingItem.status === 'orange' ? 'bg-orange-500' :
                trackingItem.status === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(100, spentPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Desktop Info Button */}
      <div className="hidden lg:flex px-4 pb-3">
        <button
          onClick={() => onOpenDetail(allocation.category)}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <Info className="w-4 h-4" />
          <span>{t('common.viewDetails')}</span>
        </button>
      </div>

      {/* Mobile Accordion Content */}
      <div
        className={cn(
          'lg:hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        <div className="border-t border-gray-100 dark:border-gray-700">
          <TransactionSection
            category={allocation.category}
            month={month}
            onViewAll={() => onOpenDetail(allocation.category)}
          />
        </div>
      </div>
    </Card>
  )
}
