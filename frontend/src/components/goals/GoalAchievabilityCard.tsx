import { useState } from 'react'
import type { GoalAchievability } from '@/types'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { formatCurrencyPrivacy, formatCurrencyCompactPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { Pencil, Trash2, ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react'

interface GoalAchievabilityCardProps {
  goalId: number
  goalName: string
  achievability: GoalAchievability
  targetAmount: number
  currentAmount: number
  onEdit?: (goalId: number) => void
  onDelete?: (goalId: number) => void
  topExpenseCategory?: {
    name: string
    monthlyAmount: number
  }
}

export function GoalAchievabilityCard({
  goalId,
  goalName,
  achievability,
  targetAmount,
  currentAmount,
  onEdit,
  onDelete,
  topExpenseCategory,
}: GoalAchievabilityCardProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const [showDetails, setShowDetails] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Calculate progress percentage
  const progressPercentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0

  // Determine if on pace
  const isOnPace = achievability.current_monthly_net >= achievability.required_monthly
  const isCompleted = progressPercentage >= 100

  // Generate simple insight
  const getInsight = (): string => {
    if (isCompleted) {
      return t('goal.insight.achieved')
    }

    if (isOnPace) {
      return t('goal.insight.onTrackMonths', { months: achievability.months_remaining })
    }

    const gap = achievability.monthly_gap
    if (gap > 0) {
      const formattedGap = formatCurrencyPrivacy(gap, currency, exchangeRates?.rates || {}, false, isPrivacyMode)
      return t('goal.insight.saveMore', { amount: formattedGap })
    }

    return t('goal.insight.everyBitCounts')
  }

  // Get status color
  const statusColor = isCompleted
    ? 'text-emerald-600 dark:text-emerald-400'
    : isOnPace
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-amber-600 dark:text-amber-400'

  const statusBg = isCompleted
    ? 'bg-emerald-50 dark:bg-emerald-900/20'
    : isOnPace
      ? 'bg-emerald-50 dark:bg-emerald-900/20'
      : 'bg-amber-50 dark:bg-amber-900/20'

  const progressColor = isCompleted
    ? 'bg-emerald-500'
    : isOnPace
      ? 'bg-emerald-500'
      : 'bg-amber-500'

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all',
      'bg-white dark:bg-gray-800',
      'border-gray-200 dark:border-gray-700',
      'hover:shadow-md'
    )}>
      {/* Main Card - Always Visible */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {goalName}
            </h3>
          </div>
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            isCompleted || isOnPace
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
          )}>
            {isCompleted ? '🎉' : isOnPace ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {isCompleted ? t('goal.status.completed') : isOnPace ? t('goal.status.onTrack') : t('goal.status.behind')}
          </div>
        </div>

        {/* Progress Bar & Amount */}
        <div className="mb-3">
          <div className="flex justify-between items-end mb-1.5">
            <div>
              <span className={cn('text-2xl font-bold', statusColor)}>
                {Math.round(progressPercentage)}%
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formatCurrencyCompactPrivacy(currentAmount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)} / {formatCurrencyCompactPrivacy(targetAmount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {achievability.months_remaining} {t('goal.months', 'months')}
              </p>
              {!isCompleted && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {isOnPace ? t('goal.onTrack', 'On track') : t('goal.behind', 'Behind')}
                </p>
              )}
            </div>
          </div>
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', progressColor)}
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
        </div>

        {/* Insight */}
        <div className={cn('rounded-lg p-2.5', statusBg)}>
          <p className={cn('text-xs', statusColor)}>
            💡 {getInsight()}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
          {showDetails ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              {t('button.hideDetails', 'Hide Details')}
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              {t('button.showDetails', 'Show Details')}
            </>
          )}
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(goalId)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              {t('button.edit', 'Edit')}
            </button>
          )}
          {onDelete && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('button.delete', 'Delete')}
            </button>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && onDelete && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2">
            <p className="text-xs text-center text-gray-600 dark:text-gray-400 mb-2">
              {t('goal.deleteConfirm')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('button.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  onDelete(goalId)
                  setShowDeleteConfirm(false)
                }}
                className="flex-1 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {t('button.delete', 'Delete')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 animate-in slide-in-from-top-2">
          {/* Monthly Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                {t('goal.savingNow', 'Saving now')}
              </p>
              <p className={cn(
                'text-sm font-semibold',
                isOnPace ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              )}>
                {formatCurrencyCompactPrivacy(achievability.current_monthly_net, currency, exchangeRates?.rates || {}, false, isPrivacyMode)}
                <span className="text-xs font-normal text-gray-400">/mo</span>
              </p>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                {t('goal.needed', 'Needed')}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrencyCompactPrivacy(achievability.required_monthly, currency, exchangeRates?.rates || {}, false, isPrivacyMode)}
                <span className="text-xs font-normal text-gray-400">/mo</span>
              </p>
            </div>
          </div>

          {/* Category tip when behind */}
          {!isOnPace && !isCompleted && topExpenseCategory && topExpenseCategory.monthlyAmount > 0 && (
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                💰 {t('goal.insight.topExpenseTip', {
                  category: t(`categories.${topExpenseCategory.name}`, { defaultValue: topExpenseCategory.name }),
                  amount: formatCurrencyPrivacy(topExpenseCategory.monthlyAmount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
