import { formatCurrency } from '@/utils/formatCurrency'
import { calculatePercentage } from '@/utils/calculations'
import { Badge } from '@/components/ui/Badge'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import type { Goal } from '@/types'

interface GoalProgressCardProps {
  goal: Goal
  compact?: boolean
}

const statusConfig = {
  ahead: {
    variant: 'success' as const,
    icon: '↗',
    label: '順調',
  },
  'on-track': {
    variant: 'info' as const,
    icon: '→',
    label: '目標達成',
  },
  behind: {
    variant: 'error' as const,
    icon: '↘',
    label: '注意',
  },
  achieved: {
    variant: 'success' as const,
    icon: '✓',
    label: '達成',
  },
}

export function GoalProgressCard({ goal, compact = false }: GoalProgressCardProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const progress = calculatePercentage(goal.current_amount, goal.target_amount)
  const config = statusConfig[goal.status]

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-700">{goal.name || `${goal.years}年目標`}</p>
            <p className="text-xs text-gray-500">
              {formatCurrency(goal.current_amount, currency, exchangeRates?.rates || {}, true)} / {formatCurrency(goal.target_amount, currency, exchangeRates?.rates || {}, true)}
            </p>
          </div>
          <Badge variant={config.variant} aria-label={`目標状態: ${config.label}`}>
            <span aria-hidden="true">{config.icon}</span> {config.label}
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
          {progress}% 完了
          {goal.monthly_required > 0 && ` · 月々${formatCurrency(goal.monthly_required, currency, exchangeRates?.rates || {}, true)}必要`}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{goal.years}年目標</h3>
          <p className="text-gray-600">
            {goal.start_date} → {goal.end_date}
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
          {config.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">目標金額</p>
          <p className="text-3xl font-bold font-numbers text-gray-900">
            {formatCurrency(goal.target_amount, currency, exchangeRates?.rates || {}, true)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">現在の貯蓄</p>
          <p className="text-3xl font-bold font-numbers text-blue-600">
            {formatCurrency(goal.current_amount, currency, exchangeRates?.rates || {}, true)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">達成率</p>
          <p className="text-3xl font-bold font-numbers text-blue-600">{progress}%</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">進捗状況</span>
          <span className="text-sm font-semibold text-blue-600">{progress}%</span>
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

      {goal.status === 'achieved' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900">
            🎉 おめでとうございます！{goal.years}年目標を達成しました。
          </p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">
            月々{formatCurrency(goal.monthly_required, currency, exchangeRates?.rates || {}, true)}の貯蓄が必要です
          </p>
        </div>
      )}
    </div>
  )
}
