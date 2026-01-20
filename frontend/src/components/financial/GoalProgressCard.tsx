import { useState, useEffect } from 'react'
import { formatCurrency } from '@/utils/formatCurrency'
import { Badge } from '@/components/ui/Badge'
import { Confetti } from '@/components/ui/Confetti'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import type { GoalProgress } from '@/types/goal'
import { useTranslation } from 'react-i18next'

// Track which goals have been celebrated this session
const celebratedGoals = new Set<number>()

interface GoalProgressCardProps {
  goal: GoalProgress
  compact?: boolean
}

const statusConfig = {
  completed: {
    variant: 'success' as const,
    icon: '✓',
    labelKey: 'goals.status.completed',
  },
  ahead: {
    variant: 'success' as const,
    icon: '↗',
    labelKey: 'goals.status.ahead',
  },
  on_track: {
    variant: 'info' as const,
    icon: '→',
    labelKey: 'goals.status.on_track',
  },
  behind: {
    variant: 'warning' as const,
    icon: '↘',
    labelKey: 'goals.status.behind',
  },
}

export function GoalProgressCard({ goal, compact = false }: GoalProgressCardProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { t } = useTranslation()
  const progress = goal.progress_percentage ?? 0
  const config = statusConfig[goal.status as keyof typeof statusConfig] || statusConfig.on_track
  const [showConfetti, setShowConfetti] = useState(false)

  // Trigger confetti when goal is completed (only once per session)
  useEffect(() => {
    if (progress >= 100 && goal.goal_id && !celebratedGoals.has(goal.goal_id)) {
      celebratedGoals.add(goal.goal_id)
      setShowConfetti(true)
    }
  }, [progress, goal.goal_id])

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-700">{goal.name || t('goals.yearGoal', { years: goal.years })}</p>
            <p className="text-xs text-gray-500">
              {formatCurrency(goal.total_saved, currency, exchangeRates?.rates || {}, true)} / {formatCurrency(goal.target_amount, currency, exchangeRates?.rates || {}, true)}
            </p>
          </div>
          <Badge variant={config.variant} aria-label={t(config.labelKey)}>
            <span aria-hidden="true">{config.icon}</span> {t(config.labelKey)}
          </Badge>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {progress.toFixed(1)}% {t('goals.complete')}
          {goal.needed_per_month > 0 && ` · ${t('goals.monthlyRequired', { amount: formatCurrency(goal.needed_per_month, currency, exchangeRates?.rates || {}, true) })}`}
        </p>
      </div>
    )
  }

  return (
    <>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{goal.name || t('goals.yearGoal', { years: goal.years })}</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {goal.start_date} → {goal.target_date}
          </p>
          {goal.account_name && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <span>🐷</span> {goal.account_name}
            </p>
          )}
        </div>
        <Badge variant={config.variant} className="px-4 py-2">
          <span aria-hidden="true">{config.icon}</span> {t(config.labelKey)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('goals.targetAmount')}</p>
          <p className="text-3xl font-bold font-numbers text-gray-900 dark:text-gray-100">
            {formatCurrency(goal.target_amount, currency, exchangeRates?.rates || {}, true)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('goals.currentSavings')}</p>
          <p className="text-3xl font-bold font-numbers text-blue-600 dark:text-blue-400">
            {formatCurrency(goal.total_saved, currency, exchangeRates?.rates || {}, true)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('goals.achievementRate')}</p>
          <p className="text-3xl font-bold font-numbers text-blue-600 dark:text-blue-400">{Math.min(progress, 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('goals.progress')}</span>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{Math.min(progress, 100).toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
            role="progressbar"
            aria-valuenow={Math.min(progress, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {progress >= 100 ? (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            🎉 {t('goals.achievedMessage', { years: goal.years })}
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {t('goals.remaining')}: {formatCurrency(goal.needed_remaining, currency, exchangeRates?.rates || {}, true)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ~{formatCurrency(goal.needed_per_month, currency, exchangeRates?.rates || {}, true)}/{t('goals.month')}
            </p>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
