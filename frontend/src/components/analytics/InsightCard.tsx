import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import type { SpendingInsight } from '@/types/analytics'

interface InsightCardProps {
  insight: SpendingInsight
  displayCurrency?: string
  onScrollToChart?: () => void
}

const INSIGHT_ICONS: Record<string, string> = {
  spike: '⚠️',
  trend: '📈',
  unusual: '📊',
  budget: '💰',
  saving: '🎉',
}

const SEVERITY_STYLES: Record<string, string> = {
  warning: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20',
  success: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
  info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
}

export function InsightCard({
  insight,
  displayCurrency = 'JPY',
  onScrollToChart,
}: InsightCardProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const handleCTAClick = () => {
    if (insight.category) {
      // Navigate to transactions filtered by category
      navigate({
        to: '/transactions',
        search: { categories: insight.category },
      })
    } else if (insight.type === 'trend' || insight.type === 'unusual') {
      // Scroll to chart section
      onScrollToChart?.()
    }
  }

  const getCTAText = () => {
    if (insight.category) {
      return t('analytics.viewTransactions', { category: insight.category })
    }
    if (insight.type === 'trend' || insight.type === 'unusual') {
      return t('analytics.viewBreakdown')
    }
    return t('analytics.learnMore')
  }

  return (
    <div
      className={cn(
        'rounded-xl p-4 border-l-4 min-w-0',
        'bg-white dark:bg-gray-800',
        'shadow-card',
        SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">
          {INSIGHT_ICONS[insight.type] || '💡'}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">
            {insight.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {insight.message}
          </p>
          {insight.amount && (
            <p className="text-base font-bold font-numbers text-gray-800 dark:text-gray-200 mt-1.5">
              {formatCurrency(insight.amount, displayCurrency)}
              {insight.percentage_change && (
                <span className={cn(
                  'ml-2 text-sm font-semibold',
                  insight.percentage_change > 0 ? 'text-red-600' : 'text-green-600'
                )}>
                  {insight.percentage_change > 0 ? '+' : ''}{insight.percentage_change}%
                </span>
              )}
            </p>
          )}
          <Button
            variant="ghost"
            className="mt-2 p-0 h-auto text-sm font-semibold text-primary-600 hover:text-primary-700"
            onClick={handleCTAClick}
          >
            {getCTAText()} →
          </Button>
        </div>
      </div>
    </div>
  )
}
