import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ForecastChartLazy } from '@/components/charts/LazyCharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchForecast } from '@/services/analytics-service'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'

export function CashFlowForecastCard() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()

  const { data: forecast, isLoading, error } = useQuery({
    queryKey: ['forecast', 6],
    queryFn: () => fetchForecast(6),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2.5 mb-4">
          <Skeleton className="h-7 w-7 rounded-xl" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </Card>
    )
  }

  if (error || !forecast) {
    return (
      <Card>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('forecast.title')}
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p>{t('forecast.error')}</p>
        </div>
      </Card>
    )
  }

  const { months, summary, current_balance } = forecast
  const hasData = months && months.length > 0

  // Get the last projected month for display
  const lastMonth = months[months.length - 1]
  const balanceChange = summary.end_balance - current_balance
  const isPositiveChange = balanceChange >= 0

  // Check for negative balance warning
  const hasNegativeWarning = summary.months_until_negative !== null

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('forecast.title')}
          </h3>
        </div>
        {hasNegativeWarning && (
          <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('forecast.warningNegative', { months: summary.months_until_negative })}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {hasData ? (
        <div className="h-80" role="img" aria-label={t('forecast.chartLabel')}>
          <ForecastChartLazy data={months} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-80 text-gray-400 dark:text-gray-500">
          {t('forecast.noData')}
        </div>
      )}

      {/* Summary Stats */}
      {hasData && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* End Balance */}
          <div className={cn(
            "p-4 rounded-lg",
            isPositiveChange
              ? "bg-income-50 dark:bg-income-900/20"
              : "bg-expense-50 dark:bg-expense-900/20"
          )}>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('forecast.projectedBalance', { month: lastMonth?.month.split('-')[1] })}
            </p>
            <p className={cn(
              "text-2xl font-bold",
              isPositiveChange
                ? "text-income-600 dark:text-income-300"
                : "text-expense-600 dark:text-expense-300"
            )}>
              {formatCurrency(summary.end_balance, currency, exchangeRates?.rates || {}, false)}
            </p>
            <div className={cn(
              "flex items-center gap-1 mt-1 text-sm",
              isPositiveChange
                ? "text-income-600 dark:text-income-300"
                : "text-expense-600 dark:text-expense-300"
            )}>
              {isPositiveChange ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {isPositiveChange ? '+' : ''}
                {formatCurrency(balanceChange, currency, exchangeRates?.rates || {}, false)}
              </span>
            </div>
          </div>

          {/* Average Monthly Net */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('forecast.avgMonthlySavings')}
            </p>
            <p className={cn(
              "text-2xl font-bold",
              summary.avg_monthly_net >= 0
                ? "text-gray-900 dark:text-gray-100"
                : "text-expense-600 dark:text-expense-300"
            )}>
              {summary.avg_monthly_net >= 0 ? '+' : ''}
              {formatCurrency(summary.avg_monthly_net, currency, exchangeRates?.rates || {}, false)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('forecast.perMonth')}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
