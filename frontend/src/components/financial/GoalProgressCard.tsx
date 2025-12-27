import { formatCurrency } from '@/utils/formatCurrency'
import { Badge } from '@/components/ui/Badge'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import type { GoalProgress } from '@/types/goal'
import { useTranslation } from 'react-i18next'

interface GoalProgressCardProps {
  goal: GoalProgress
  compact?: boolean
}

const statusConfig = {
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
    variant: 'error' as const,
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

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-700">{goal.name || `${goal.years}${t('goals.yearGoal')}`}</p>
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
    <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{goal.name || `${goal.years}${t('goals.yearGoal')}`}</h3>
          <p className="text-gray-600">
            {goal.start_date} → {goal.target_date}
          </p>
        </div>
        <Badge variant={config.variant} className="px-4 py-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {t(config.labelKey)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">{t('goals.targetAmount')}</p>
          <p className="text-3xl font-bold font-numbers text-gray-900">
            {formatCurrency(goal.target_amount, currency, exchangeRates?.rates || {}, true)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">{t('goals.currentSavings')}</p>
          <p className="text-3xl font-bold font-numbers text-blue-600">
            {formatCurrency(goal.total_saved, currency, exchangeRates?.rates || {}, true)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">{t('goals.achievementRate')}</p>
          <p className="text-3xl font-bold font-numbers text-blue-600">{progress.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{t('goals.progress')}</span>
          <span className="text-sm font-semibold text-blue-600">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {progress >= 100 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900">
            {t('goals.achievedMessage', { years: goal.years })}
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">
            {t('goals.monthlyNeeded', { amount: formatCurrency(goal.needed_per_month, currency, exchangeRates?.rates || {}, true) })}
          </p>
        </div>
      )}
    </div>
  )
}
