import type { GoalAchievability } from '@/types'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrency, formatCurrencyCompact } from '@/utils/formatCurrency'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { cn } from '@/utils/cn'

interface GoalAchievabilityCardProps {
  goalId: number
  goalName: string
  achievability: GoalAchievability
  targetAmount: number
  currentAmount: number
  onEdit?: (goalId: number) => void
}

// Simplified status config based on capped percentage
const STATUS_CONFIG = {
  on_track: {
    color: '#10b981', // emerald-500
    textColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-l-emerald-500',
    labelKey: 'goal.status.onTrack',
    emoji: '🟢',
  },
  achievable: {
    color: '#3b82f6', // blue-500
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-l-blue-500',
    labelKey: 'goal.status.achievable',
    emoji: '🔵',
  },
  challenging: {
    color: '#f97316', // orange-500
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-500',
    labelKey: 'goal.status.challenging',
    emoji: '🟠',
  },
  severe: {
    color: '#dc2626', // red-600
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-l-red-600',
    labelKey: 'goal.status.severe',
    emoji: '🔴',
  },
} as const

export function GoalAchievabilityCard({
  goalId,
  goalName,
  achievability,
  targetAmount,
  currentAmount,
  onEdit,
}: GoalAchievabilityCardProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Cap achievability percentage at 0-200%
  const cappedPercentage = Math.max(0, Math.min(200, achievability.achievable_percentage))

  // Calculate progress percentage (current vs target)
  const progressPercentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0

  // Determine status based on capped percentage
  const getStatus = (percentage: number) => {
    if (percentage >= 100) return STATUS_CONFIG.on_track
    if (percentage >= 75) return STATUS_CONFIG.achievable
    if (percentage >= 50) return STATUS_CONFIG.challenging
    return STATUS_CONFIG.severe
  }

  const status = getStatus(cappedPercentage)

  // Generate insight message
  const getInsightMessage = (): { emoji: string; message: string } => {
    const gap = achievability.monthly_gap

    // Already on track or ahead
    if (gap <= 0 || achievability.current_monthly_net >= achievability.required_monthly) {
      return {
        emoji: '🎉',
        message: t('goal.insight.onPace'),
      }
    }

    // Small gap (<¥10,000)
    if (gap < 10000) {
      return {
        emoji: '💡',
        message: t('goal.insight.smallGap', { gap: formatCurrency(gap, currency, exchangeRates?.rates || {}, false) }),
      }
    }

    // Medium gap (<¥50,000)
    if (gap < 50000) {
      return {
        emoji: '⚠️',
        message: t('goal.insight.mediumGap', { gap: formatCurrency(gap, currency, exchangeRates?.rates || {}, false) }),
      }
    }

    // Large gap
    return {
      emoji: '🔴',
      message: t('goal.insight.largeGap', { gap: formatCurrency(gap, currency, exchangeRates?.rates || {}, false) }),
    }
  }

  const insight = getInsightMessage()

  // Calculate monthly savings ratio percentage
  const monthlySavingsPercentage =
    achievability.required_monthly > 0
      ? (achievability.current_monthly_net / achievability.required_monthly) * 100
      : 0

  const cappedMonthlySavingsPercentage = Math.min(100, monthlySavingsPercentage)

  // Get color for monthly savings progress bar
  const getMonthlySavingsBarColor = () => {
    if (monthlySavingsPercentage >= 100) return 'bg-green-500'
    if (monthlySavingsPercentage >= 75) return 'bg-blue-500'
    if (monthlySavingsPercentage >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const handleCardClick = () => {
    if (isMobile && onEdit) {
      onEdit(goalId)
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(goalId)
    }
  }

  return (
    <div
      className={cn(
        'border-l-4',
        status.borderColor,
        'transition-all hover:shadow-lg',
        isMobile && onEdit && 'cursor-pointer active:scale-[0.98]'
      )}
      onClick={handleCardClick}
      role={isMobile && onEdit ? 'button' : undefined}
      tabIndex={isMobile && onEdit ? 0 : undefined}
    >
      <Card>
        {/* Header */}
        <div className="relative mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{goalName}</h3>
            <span
              className={cn(
                'text-xs font-semibold uppercase px-2.5 py-1 rounded-full',
                status.bgColor,
                status.textColor
              )}
            >
              {status.emoji} {t(status.labelKey)}
            </span>
          </div>

          {/* Desktop edit button */}
          {!isMobile && onEdit && (
            <button
              onClick={handleEditClick}
              className="absolute -top-2 -right-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('goal.editGoal')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Hero Section: Progress Ring */}
        <div className="mb-6">
          <div className="relative w-[200px] h-[200px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="90%"
                data={[{ value: progressPercentage, fill: status.color }]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  background={{ fill: '#e5e7eb' }}
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Center text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={cn('text-3xl font-bold font-mono', status.textColor)}>
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-sm font-mono mt-1 text-gray-700">
                {formatCurrencyCompact(currentAmount, currency, exchangeRates?.rates || {}, true)}
              </div>
              <div className="text-xs text-gray-400 my-1">─────</div>
              <div className="text-sm font-mono text-gray-700">
                {formatCurrencyCompact(targetAmount, currency, exchangeRates?.rates || {}, true)}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Savings Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">{t('goal.monthlySavings')}</div>
            <div className="text-xs text-gray-400">
              {t('goal.basedOnPeriod', {
                months: achievability.trend_months_actual,
                source: achievability.data_source
              })}
            </div>
          </div>
          <div className="text-lg font-mono font-semibold mb-2">
            {formatCurrency(achievability.current_monthly_net, currency, exchangeRates?.rates || {}, false)} /{' '}
            {formatCurrency(achievability.required_monthly, currency, exchangeRates?.rates || {}, false)}
            <span className="text-sm ml-2 text-gray-600">
              ({Math.round(monthlySavingsPercentage)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={cn(getMonthlySavingsBarColor(), 'h-2 rounded-full transition-all duration-500')}
              style={{ width: `${cappedMonthlySavingsPercentage}%` }}
            />
          </div>
        </div>

        {/* Insight Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="text-sm text-blue-900">
            {insight.emoji} {insight.message}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-400">{t('goal.monthsRemaining', { months: achievability.months_remaining })}</div>
      </Card>
    </div>
  )
}
