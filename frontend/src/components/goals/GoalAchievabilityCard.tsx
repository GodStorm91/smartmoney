import { useState } from 'react'
import type { GoalAchievability } from '@/types'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { formatCurrencyPrivacy, formatCurrencyCompactPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { Pencil, Trash2 } from 'lucide-react'

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Calculate progress percentage
  const progressPercentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0

  // Determine if on pace
  const isOnPace = achievability.current_monthly_net >= achievability.required_monthly

  // Generate simple insight
  const getInsight = (): string => {
    if (progressPercentage >= 100) {
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

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(goalId)
    }
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  // Progress bar color
  const progressBarColor = progressPercentage >= 100
    ? 'bg-emerald-500'
    : isOnPace
      ? 'bg-emerald-500'
      : 'bg-amber-500'

  return (
    <Card className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {goalName}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Status Badge */}
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              isOnPace || progressPercentage >= 100
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
            )}
          >
            {progressPercentage >= 100 ? '🎉' : isOnPace ? '✓' : '⚠️'} {progressPercentage >= 100 ? t('goal.status.completed') : isOnPace ? t('goal.status.onTrack') : t('goal.status.behind')}
          </span>
          {/* Edit Button */}
          {onEdit && (
            <button
              onClick={() => onEdit(goalId)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('goal.editGoal')}
            >
              <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className={cn(
            'text-2xl font-bold',
            progressPercentage >= 100
              ? 'text-emerald-600 dark:text-emerald-400'
              : isOnPace
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
          )}>
            {Math.round(progressPercentage)}%
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('goal.monthsRemaining', { months: achievability.months_remaining })}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', progressBarColor)}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
      </div>

      {/* Amount */}
      <div className="text-center mb-4">
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrencyCompactPrivacy(currentAmount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
        </span>
        <span className="text-gray-400 dark:text-gray-500 mx-2">/</span>
        <span className="text-lg text-gray-600 dark:text-gray-400">
          {formatCurrencyCompactPrivacy(targetAmount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
        </span>
      </div>

      {/* Insight */}
      <div className={cn(
        'rounded-lg p-3 mb-4',
        isOnPace || progressPercentage >= 100
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
      )}>
        <p className={cn(
          'text-sm',
          isOnPace || progressPercentage >= 100
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-amber-700 dark:text-amber-300'
        )}>
          💡 {getInsight()}
        </p>
        {/* Category tip when behind */}
        {!isOnPace && topExpenseCategory && topExpenseCategory.monthlyAmount > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-5">
            💰 {t('goal.insight.topExpenseTip', {
              category: t(`categories.${topExpenseCategory.name}`, { defaultValue: topExpenseCategory.name }),
              amount: formatCurrencyPrivacy(topExpenseCategory.monthlyAmount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)
            })}
          </p>
        )}
      </div>

      {/* Delete Button */}
      {onDelete && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          {!showDeleteConfirm ? (
            <button
              onClick={handleDeleteClick}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('goal.deleteGoal')}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                {t('goal.deleteConfirm')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
