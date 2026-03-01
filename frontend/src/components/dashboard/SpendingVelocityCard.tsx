import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Zap, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchSpendingVelocity } from '@/services/analytics-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'

export function SpendingVelocityCard() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const { data, isLoading, error } = useQuery({
    queryKey: ['spending-velocity'],
    queryFn: fetchSpendingVelocity,
    staleTime: 30 * 60 * 1000,
  })

  const fmt = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Skeleton className="h-7 w-7 rounded-xl" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-56 mb-4" />
        <Skeleton className="h-2 w-full rounded-full mb-3" />
        <Skeleton className="h-4 w-36" />
      </Card>
    )
  }

  if (error || !data) return null

  const {
    daily_average,
    projected_month_total,
    days_elapsed,
    days_in_month,
    velocity_change_pct,
    total_spent,
  } = data

  const progressPct = Math.min(100, (days_elapsed / days_in_month) * 100)
  const isSpendingUp = velocity_change_pct > 0
  const hasLastMonth = data.last_month_total > 0
  const noData = total_spent === 0

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          {t('velocity.title')}
        </h3>
      </div>

      {noData ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
          {t('velocity.noData')}
        </p>
      ) : (
        <>
          {/* Daily burn rate — hero number */}
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-[2rem] font-extrabold font-numbers text-expense-600 dark:text-expense-300 tracking-tight leading-none">
              {fmt(daily_average)}
            </span>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {t('velocity.perDay')}
            </span>
          </div>

          {/* Projected total */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('velocity.projected')}:{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {fmt(projected_month_total)}
            </span>
          </p>

          {/* Progress bar — days elapsed */}
          <div className="mb-1">
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 dark:bg-amber-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
              {t('velocity.dayProgress', { current: days_elapsed, total: days_in_month })}
            </p>
          </div>

          {/* vs last month */}
          {hasLastMonth && (
            <div className={cn(
              'flex items-center gap-1 mt-3 text-sm font-semibold',
              isSpendingUp
                ? 'text-expense-600 dark:text-expense-300'
                : 'text-income-600 dark:text-income-300'
            )}>
              {isSpendingUp ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {isSpendingUp ? '+' : ''}{velocity_change_pct.toFixed(1)}%{' '}
                {t('velocity.vsLastMonth')}
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
