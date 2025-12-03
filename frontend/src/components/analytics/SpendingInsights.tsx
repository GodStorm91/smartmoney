import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { fetchSpendingInsights } from '@/services/analytics-service'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import type { SpendingInsight } from '@/types'

const INSIGHT_ICONS: Record<SpendingInsight['type'], string> = {
  spike: '📈',
  trend: '📊',
  unusual: '🔍',
  budget: '💰',
  saving: '✨',
}

const SEVERITY_STYLES: Record<SpendingInsight['severity'], string> = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
}

const SEVERITY_TEXT: Record<SpendingInsight['severity'], string> = {
  info: 'text-blue-700 dark:text-blue-300',
  warning: 'text-amber-700 dark:text-amber-300',
  success: 'text-green-700 dark:text-green-300',
}

function InsightCard({ insight }: { insight: SpendingInsight }) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()

  return (
    <div
      className={`p-4 rounded-lg border ${SEVERITY_STYLES[insight.severity]} transition-all hover:shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{INSIGHT_ICONS[insight.type]}</span>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${SEVERITY_TEXT[insight.severity]}`}>
            {insight.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {insight.message}
          </p>
          {insight.amount && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
              {formatCurrency(insight.amount, currency, exchangeRates?.rates || {}, false)}
            </p>
          )}
        </div>
        {insight.percentage_change !== undefined && (
          <span
            className={`text-sm font-medium px-2 py-1 rounded ${
              insight.percentage_change > 0
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            }`}
          >
            {insight.percentage_change > 0 ? '+' : ''}
            {insight.percentage_change.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}

export function SpendingInsights() {
  const { t } = useTranslation('common')

  const { data, isLoading, error } = useQuery({
    queryKey: ['spending-insights'],
    queryFn: fetchSpendingInsights,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('analytics.spendingInsights', 'Spending Insights')}
        </h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('analytics.spendingInsights', 'Spending Insights')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          {t('common.error', 'Failed to load insights')}
        </p>
      </Card>
    )
  }

  const insights = data?.insights || []

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('analytics.spendingInsights', 'Spending Insights')}
      </h3>

      {insights.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-4xl mb-3 block">🎉</span>
          <p className="text-gray-600 dark:text-gray-400">
            {t('analytics.noInsights', 'No notable spending patterns detected')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {t('analytics.insightsHint', 'Keep tracking to see personalized insights')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <InsightCard key={`${insight.type}-${insight.category}-${index}`} insight={insight} />
          ))}
        </div>
      )}
    </Card>
  )
}
