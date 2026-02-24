import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { ProjectionProgressBar } from './projection-progress-bar'
import { cn } from '@/utils/cn'

interface BudgetProjectionCardProps {
  totalBudget: number
  totalSpent: number
  month: string
  className?: string
}

export function BudgetProjectionCard({
  totalBudget,
  totalSpent,
  month,
  className
}: BudgetProjectionCardProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  // Calculate date-related values
  const { daysRemaining, daysElapsed, dailyRate, safeDaily, projectedTotal, projectedPercent, overUnderAmount, status } = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number)
    const totalDays = new Date(year, monthNum, 0).getDate()
    const today = new Date()
    const currentDay = today.getDate()
    const elapsed = Math.max(1, currentDay) // Avoid division by zero
    const remaining = Math.max(0, totalDays - currentDay)

    // Calculate current daily rate (trend-based)
    const currentRate = totalSpent / elapsed

    // Calculate safe daily rate (what's needed to stay on budget)
    const remainingBudget = totalBudget - totalSpent
    const safeDailyRate = remaining > 0 ? remainingBudget / remaining : 0

    // Project total based on current trend
    const projected = totalSpent + (currentRate * remaining)
    const percent = totalBudget > 0 ? (projected / totalBudget) * 100 : 0

    // Calculate over/under amount
    const overUnder = projected - totalBudget

    // Determine status
    let statusResult: 'good' | 'warning' | 'danger'
    if (percent > 100) statusResult = 'danger'
    else if (percent > 90) statusResult = 'warning'
    else statusResult = 'good'

    return {
      daysRemaining: remaining,
      daysElapsed: elapsed,
      dailyRate: currentRate,
      safeDaily: safeDailyRate,
      projectedTotal: projected,
      projectedPercent: percent,
      overUnderAmount: overUnder,
      status: statusResult
    }
  }, [month, totalSpent, totalBudget])

  // Get status styles
  const getStatusStyles = () => {
    switch (status) {
      case 'danger':
        return {
          bg: 'bg-expense-100 dark:bg-expense-900/30',
          text: 'text-expense-600 dark:text-expense-300',
          icon: AlertTriangle,
          label: t('budget.projection.status.overBudget'),
          message: t('budget.projection.overBy', { amount: formatCurrency(projectedTotal - totalBudget) })
        }
      case 'warning':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-400',
          icon: AlertTriangle,
          label: t('budget.projection.status.atRisk'),
          message: t('budget.projection.atPace', { amount: formatCurrency(projectedTotal) })
        }
      default:
        return {
          bg: 'bg-income-100 dark:bg-income-900/30',
          text: 'text-income-600 dark:text-income-300',
          icon: CheckCircle,
          label: t('budget.projection.status.onTrack'),
          message: t('budget.projection.underBy', { amount: formatCurrency(totalBudget - projectedTotal) })
        }
    }
  }

  const statusInfo = getStatusStyles()
  const StatusIcon = statusInfo.icon

  // Don't render if no budget set
  if (totalBudget <= 0) {
    return null
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t('budget.projection.title')}
          </h3>
        </div>
        <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', statusInfo.bg, statusInfo.text)}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusInfo.label}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Days Remaining */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{t('budget.projection.daysLeft', { count: daysRemaining })}</span>
        </div>

        {/* Daily Pace Comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Daily Rate */}
          <div className={cn(
            'p-3 rounded-lg',
            dailyRate > safeDaily && safeDaily > 0
              ? 'bg-amber-50 dark:bg-amber-900/20'
              : 'bg-gray-50 dark:bg-gray-800/50'
          )}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('budget.projection.currentPace')}
            </p>
            <p className={cn(
              'text-xl font-bold',
              dailyRate > safeDaily && safeDaily > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-gray-900 dark:text-gray-100'
            )}>
              {formatCurrency(dailyRate)}
              <span className="text-xs font-normal text-gray-500">/{t('day')}</span>
            </p>
          </div>

          {/* Safe Daily Rate */}
          <div className="p-3 bg-income-50 dark:bg-income-900/20 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('budget.projection.safePace')}
            </p>
            <p className="text-xl font-bold text-income-600 dark:text-income-300">
              {safeDaily > 0 ? formatCurrency(safeDaily) : '—'}
              {safeDaily > 0 && <span className="text-xs font-normal text-gray-500">/{t('day')}</span>}
            </p>
          </div>
        </div>

        {/* Spending Summary */}
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-gray-600 dark:text-gray-400">
            {t('budget.projection.spent')}: {formatCurrency(totalSpent)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {t('budget.projection.ofBudget')}: {formatCurrency(totalBudget)}
          </span>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">
              {t('budget.projection.percentOfBudget', { percent: Math.round(projectedPercent) })}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {formatCurrency(totalBudget)} {t('budget.projection.ofBudget')}
            </span>
          </div>
          <ProjectionProgressBar
            spent={totalSpent}
            projected={projectedTotal}
            budget={totalBudget}
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
            <span>{formatCurrency(totalSpent)}</span>
            <span>{formatCurrency(totalBudget)}</span>
          </div>
        </div>

        {/* Actionable Message */}
        <div className={cn(
          'flex items-start gap-2 p-3 rounded-lg text-sm',
          statusInfo.bg
        )}
        role="alert"
        aria-live="polite"
        >
          <StatusIcon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', statusInfo.text)} aria-hidden="true" />
          <div className={statusInfo.text}>
            <p className="font-medium">{statusInfo.label}</p>
            <p className="mt-0.5 opacity-90">{statusInfo.message}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
