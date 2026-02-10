import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, AlertTriangle, Calendar } from 'lucide-react'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'

interface BudgetPulseHeroProps {
  totalBudget: number
  totalSpent: number
  totalAllocated: number
  month: string
  className?: string
}

export function BudgetPulseHero({
  totalBudget,
  totalSpent,
  totalAllocated,
  month,
  className
}: BudgetPulseHeroProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const fmt = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)
  const fmtCompact = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  const availableToSpend = totalBudget - totalSpent
  const spentPercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0
  const availablePercent = totalBudget > 0 ? Math.max(0, (availableToSpend / totalBudget) * 100) : 0

  // Projection calculations
  const { daysRemaining, dailyRate, safeDaily, status } = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number)
    const totalDays = new Date(year, monthNum, 0).getDate()
    const currentDay = new Date().getDate()
    const elapsed = Math.max(1, currentDay)
    const remaining = Math.max(0, totalDays - currentDay)

    const currentRate = totalSpent / elapsed
    const remainingBudget = totalBudget - totalSpent
    const safeDailyRate = remaining > 0 ? remainingBudget / remaining : 0
    const projected = totalSpent + (currentRate * remaining)
    const percent = totalBudget > 0 ? (projected / totalBudget) * 100 : 0

    let s: 'good' | 'warning' | 'danger' = 'good'
    if (percent > 100) s = 'danger'
    else if (percent > 90) s = 'warning'

    return { daysRemaining: remaining, dailyRate: currentRate, safeDaily: safeDailyRate, status: s }
  }, [month, totalSpent, totalBudget])

  // Health status
  const health = useMemo(() => {
    if (totalSpent > totalAllocated) return {
      label: t('budget.health.overBudgetStatus'), status: 'danger' as const,
      color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', ring: 'ring-red-200 dark:ring-red-800'
    }
    if (spentPercent > 95) return {
      label: t('budget.health.almostFull'), status: 'warning' as const,
      color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', ring: 'ring-amber-200 dark:ring-amber-800'
    }
    if (spentPercent > 85) return {
      label: t('budget.health.warningNearLimit'), status: 'caution' as const,
      color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30', ring: 'ring-yellow-200 dark:ring-yellow-800'
    }
    return {
      label: t('budget.health.onTrack'), status: 'good' as const,
      color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30', ring: 'ring-green-200 dark:ring-green-800'
    }
  }, [totalSpent, totalAllocated, spentPercent, t])

  const paceWarning = dailyRate > safeDaily && safeDaily > 0

  return (
    <div className={cn('rounded-2xl ring-1 overflow-hidden', health.bg, health.ring, className)}>
      {/* Top: Available to spend + health badge */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs font-medium opacity-60 uppercase tracking-wider">
            {t('budget.availableToSpend')}
          </p>
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            health.status === 'danger' ? 'bg-red-500 text-white' :
            health.status === 'warning' ? 'bg-amber-500 text-white' :
            health.status === 'caution' ? 'bg-yellow-500 text-gray-900' :
            'bg-green-500 text-white'
          )}>
            {health.status === 'danger' ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            {health.label}
          </div>
        </div>

        <p className={cn(
          'text-4xl font-extrabold tracking-tight',
          availableToSpend < 0 ? 'text-red-600 dark:text-red-400' : health.color
        )}>
          {availableToSpend < 0 && '−'}{fmt(Math.abs(availableToSpend))}
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              availableToSpend < 0 ? 'bg-red-500' :
              availablePercent < 20 ? 'bg-amber-500' :
              availablePercent < 40 ? 'bg-yellow-500' : 'bg-green-500'
            )}
            style={{ width: `${Math.min(100, Math.max(0, availablePercent))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs opacity-70 mt-1.5">
          <span>{fmtCompact(totalSpent)} {t('budget.spent')}</span>
          <span>{t('budget.ofTotalBudget', { total: fmtCompact(totalBudget) })}</span>
        </div>
      </div>

      {/* Bottom: Pace + Days remaining — compact row */}
      <div className="px-4 py-3 bg-black/5 dark:bg-white/5 grid grid-cols-3 gap-3">
        {/* Current pace */}
        <div className="min-w-0">
          <p className="text-[10px] font-medium opacity-50 uppercase tracking-wider truncate">
            {t('budget.projection.currentPace')}
          </p>
          <p className={cn(
            'text-lg font-bold leading-tight',
            paceWarning ? 'text-amber-600 dark:text-amber-400' : ''
          )}>
            {fmtCompact(dailyRate)}
            <span className="text-[10px] font-normal opacity-50">{t('budget.pulse.perDay')}</span>
          </p>
        </div>

        {/* Safe pace */}
        <div className="min-w-0">
          <p className="text-[10px] font-medium opacity-50 uppercase tracking-wider truncate">
            {t('budget.projection.safePace')}
          </p>
          <p className="text-lg font-bold leading-tight text-green-600 dark:text-green-400">
            {safeDaily > 0 ? fmtCompact(safeDaily) : '—'}
            {safeDaily > 0 && (
              <span className="text-[10px] font-normal opacity-50">{t('budget.pulse.perDay')}</span>
            )}
          </p>
        </div>

        {/* Days remaining */}
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-medium opacity-50 uppercase tracking-wider truncate">
            {t('budget.daysLeft')}
          </p>
          <div className="flex items-center justify-end gap-1">
            <Calendar className="w-3.5 h-3.5 opacity-50" />
            <p className="text-lg font-bold leading-tight">{daysRemaining}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
