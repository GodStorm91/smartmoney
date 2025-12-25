import type { GoalAchievability } from '@/types'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { formatCurrencyPrivacy, formatCurrencyCompactPrivacy } from '@/utils/formatCurrency'
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

// Simplified status config - focus on pace
const STATUS_CONFIG = {
  on_track: {
    color: '#10b981', // emerald-500
    textColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    darkBgColor: 'dark:bg-emerald-900/30',
    borderColor: 'border-l-emerald-500',
    labelKey: 'goal.pace.onTrack',
  },
  slightly_behind: {
    color: '#3b82f6', // blue-500
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    darkBgColor: 'dark:bg-blue-900/30',
    borderColor: 'border-l-blue-500',
    labelKey: 'goal.pace.slightlyBehind',
  },
  behind: {
    color: '#f97316', // orange-500
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    darkBgColor: 'dark:bg-orange-900/30',
    borderColor: 'border-l-orange-500',
    labelKey: 'goal.pace.behind',
  },
  needs_attention: {
    color: '#eab308', // yellow-500
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    darkBgColor: 'dark:bg-yellow-900/30',
    borderColor: 'border-l-yellow-500',
    labelKey: 'goal.pace.needsAttention',
  },
} as const

// Milestone thresholds
const MILESTONES = [25, 50, 75, 100]

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
  const { isPrivacyMode } = usePrivacy()
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Calculate progress percentage (current vs target)
  const progressPercentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0

  // Determine if on pace based on monthly savings vs required
  const isOnPace = achievability.current_monthly_net >= achievability.required_monthly
  const paceRatio = achievability.required_monthly > 0
    ? achievability.current_monthly_net / achievability.required_monthly
    : 1

  // Determine status based on pace (not achievability percentage)
  const getStatus = () => {
    if (isOnPace || paceRatio >= 1) return STATUS_CONFIG.on_track
    if (paceRatio >= 0.75) return STATUS_CONFIG.slightly_behind
    if (paceRatio >= 0.5) return STATUS_CONFIG.behind
    return STATUS_CONFIG.needs_attention
  }

  const status = getStatus()

  // Get current milestone
  const getCurrentMilestone = () => {
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (progressPercentage >= MILESTONES[i]) {
        return MILESTONES[i]
      }
    }
    return 0
  }

  const currentMilestone = getCurrentMilestone()
  const nextMilestone = MILESTONES.find(m => m > progressPercentage) || 100

  // Generate simple, actionable insight
  const getInsight = (): string => {
    // Goal achieved
    if (progressPercentage >= 100) {
      return t('goal.insight.achieved')
    }

    // On pace
    if (isOnPace) {
      return t('goal.insight.keepGoing', { months: achievability.months_remaining })
    }

    // Calculate how much more needed per month
    const gap = achievability.monthly_gap
    if (gap > 0) {
      const formattedGap = formatCurrencyPrivacy(gap, currency, exchangeRates?.rates || {}, false, isPrivacyMode)
      return t('goal.insight.saveMore', { amount: formattedGap })
    }

    return t('goal.insight.everyBitCounts')
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{goalName}</h3>
            <span
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full',
                status.bgColor,
                status.darkBgColor,
                status.textColor
              )}
            >
              {isOnPace ? '✓' : '○'} {t(status.labelKey)}
            </span>
          </div>

          {/* Desktop edit button */}
          {!isMobile && onEdit && (
            <button
              onClick={handleEditClick}
              className="absolute -top-2 -right-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('goal.editGoal')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
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
        <div className="mb-4">
          <div className="relative w-[180px] h-[180px] mx-auto">
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
              <div className="text-sm font-mono mt-1 text-gray-700 dark:text-gray-300">
                {formatCurrencyCompactPrivacy(currentAmount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 my-0.5">/</div>
              <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {formatCurrencyCompactPrivacy(targetAmount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2">
            {MILESTONES.map((milestone, index) => {
              const isCompleted = progressPercentage >= milestone
              const isCurrent = currentMilestone === milestone && milestone > 0
              return (
                <div key={milestone} className="flex items-center">
                  {/* Milestone dot */}
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full transition-all',
                      isCompleted
                        ? 'bg-emerald-500'
                        : 'bg-gray-300 dark:bg-gray-600',
                      isCurrent && 'ring-2 ring-emerald-300 ring-offset-1'
                    )}
                    title={`${milestone}%`}
                  />
                  {/* Connector line (except after last) */}
                  {index < MILESTONES.length - 1 && (
                    <div
                      className={cn(
                        'w-8 h-0.5 mx-1',
                        progressPercentage > milestone
                          ? 'bg-emerald-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
            {progressPercentage >= 100
              ? t('goal.milestone.completed')
              : t('goal.milestone.next', { percent: nextMilestone })}
          </div>
        </div>

        {/* Simple Insight */}
        <div className={cn(
          'rounded-lg p-3 mb-3',
          status.bgColor,
          status.darkBgColor,
          'border',
          isOnPace ? 'border-emerald-200 dark:border-emerald-800' : 'border-gray-200 dark:border-gray-700'
        )}>
          <div className={cn('text-sm', status.textColor, 'dark:text-gray-200')}>
            💡 {getInsight()}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
          {t('goal.monthsRemaining', { months: achievability.months_remaining })}
        </div>
      </Card>
    </div>
  )
}
