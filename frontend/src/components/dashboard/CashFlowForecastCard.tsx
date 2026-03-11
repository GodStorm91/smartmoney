import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ForecastChartLazy } from '@/components/charts/LazyCharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchForecast } from '@/services/analytics-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'

export function CashFlowForecastCard() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const { data: forecast, isLoading, error } = useQuery({
    queryKey: ['forecast', 6],
    queryFn: () => fetchForecast(6),
    staleTime: 5 * 60 * 1000,
  })

  const fmt = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="h-7 w-7 rounded-xl" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-56 w-full rounded-lg" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </Card>
    )
  }

  if (error || !forecast) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('forecast.title')}
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p className="text-sm">{t('forecast.error')}</p>
        </div>
      </Card>
    )
  }

  const { months, summary, current_balance } = forecast
  const hasData = months && months.length > 0

  const lastMonth = months[months.length - 1]
  const balanceChange = summary.end_balance - current_balance
  const isPositiveChange = balanceChange >= 0
  const hasNegativeWarning = summary.months_until_negative !== null

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('forecast.title')}
          </h3>
        </div>
        {hasNegativeWarning && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3 inline -mt-0.5 mr-1" />
            {t('forecast.warningNegative', { months: summary.months_until_negative })}
          </span>
        )}
      </div>

      {/* Chart */}
      {hasData ? (
        <div className="h-56" role="img" aria-label={t('forecast.chartLabel')}>
          <ForecastChartLazy data={months} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
          {t('forecast.noData')}
        </div>
      )}

      {/* Summary Stats */}
      {hasData && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* End Balance */}
          <div className={cn(
            "p-3 rounded-lg",
            isPositiveChange
              ? "bg-income-50 dark:bg-income-900/20"
              : "bg-expense-50 dark:bg-expense-900/20"
          )}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('forecast.projectedBalance', { month: lastMonth?.month.split('-')[1] })}
            </p>
            <p className={cn(
              "text-2xl font-bold font-numbers tracking-tight leading-none",
              isPositiveChange
                ? "text-income-600 dark:text-income-300"
                : "text-expense-600 dark:text-expense-300"
            )}>
              {fmt(summary.end_balance)}
            </p>
            <div className={cn(
              "flex items-center gap-1 mt-1.5 text-xs font-medium font-numbers",
              isPositiveChange
                ? "text-income-600 dark:text-income-300"
                : "text-expense-600 dark:text-expense-300"
            )}>
              {isPositiveChange ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {isPositiveChange ? '+' : ''}
                {fmt(balanceChange)}
              </span>
            </div>
          </div>

          {/* Average Monthly Net */}
          <div className={cn(
            "p-3 rounded-lg",
            summary.avg_monthly_net >= 0
              ? "bg-net-50 dark:bg-net-900/20"
              : "bg-expense-50 dark:bg-expense-900/20"
          )}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('forecast.avgMonthlySavings')}
            </p>
            <p className={cn(
              "text-2xl font-bold font-numbers tracking-tight leading-none",
              summary.avg_monthly_net >= 0
                ? "text-net-600 dark:text-net-300"
                : "text-expense-600 dark:text-expense-300"
            )}>
              {summary.avg_monthly_net >= 0 ? '+' : ''}
              {fmt(summary.avg_monthly_net)}
            </p>
            <p className={cn(
              "text-[11px] mt-1.5 font-medium",
              summary.avg_monthly_net >= 0
                ? "text-net-600/60 dark:text-net-300/60"
                : "text-expense-600/60 dark:text-expense-300/60"
            )}>
              {t('forecast.perMonth')}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
