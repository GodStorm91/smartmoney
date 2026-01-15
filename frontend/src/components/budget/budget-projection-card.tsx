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
  const { daysRemaining, dailyRate, projectedTotal, projectedPercent, status } = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number)
    const totalDays = new Date(year, monthNum, 0).getDate()
    const today = new Date()
    const currentDay = today.getDate()
    const daysElapsed = Math.max(1, currentDay) // Avoid division by zero
    const remaining = Math.max(0, totalDays - currentDay)

    // Calculate rates
    const rate = totalSpent / daysElapsed
    const projected = totalSpent + (rate * remaining)
    const percent = totalBudget > 0 ? (projected / totalBudget) * 100 : 0

    // Determine status
    let statusResult: 'good' | 'warning' | 'danger'
    if (percent > 100) statusResult = 'danger'
    else if (percent > 90) statusResult = 'warning'
    else statusResult = 'good'

    return {
      daysRemaining: remaining,
      dailyRate: rate,
      projectedTotal: projected,
      projectedPercent: percent,
      status: statusResult
    }
  }, [month, totalSpent, totalBudget])

  // Get status styles
  const getStatusStyles = () => {
    switch (status) {
      case 'danger':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-400',
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
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-400',
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

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Spent */}
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('budget.projection.spent')}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalSpent)}
            </p>
          </div>

          {/* Daily Rate */}
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('budget.projection.dailyRate')}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(dailyRate)}
              <span className="text-xs font-normal text-gray-500">/{t('common.day')}</span>
            </p>
          </div>

          {/* Projected */}
          <div className={cn(
            'text-center p-3 rounded-lg',
            status === 'danger' ? 'bg-red-50 dark:bg-red-900/20' :
            status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
            'bg-green-50 dark:bg-green-900/20'
          )}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('budget.projection.projected')}
            </p>
            <p className={cn(
              'text-lg font-bold',
              status === 'danger' ? 'text-red-700 dark:text-red-400' :
              status === 'warning' ? 'text-amber-700 dark:text-amber-400' :
              'text-green-700 dark:text-green-400'
            )}>
              {formatCurrency(projectedTotal)}
            </p>
          </div>
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

        {/* Message */}
        <div className={cn(
          'flex items-start gap-2 p-3 rounded-lg text-sm',
          statusInfo.bg
        )}>
          <Info className={cn('w-4 h-4 mt-0.5 flex-shrink-0', statusInfo.text)} />
          <p className={statusInfo.text}>
            {statusInfo.message}
          </p>
        </div>
      </div>
    </Card>
  )
}
