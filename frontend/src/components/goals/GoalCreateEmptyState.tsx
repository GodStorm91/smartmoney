import { useTranslation } from 'react-i18next'
import { GoalCreateCard } from './GoalCreateCard'

interface GoalCreateEmptyStateProps {
  onCreateClick: (years?: number) => void
  existingGoalYears: number[]
  maxGoals: number
}

const PRESET_YEARS = [1, 3, 5, 10] as const

export function GoalCreateEmptyState({
  onCreateClick,
  existingGoalYears,
  maxGoals,
}: GoalCreateEmptyStateProps) {
  const { t } = useTranslation('common')
  const isYearDisabled = (years: number) => existingGoalYears.includes(years)
  const remainingSlots = maxGoals - existingGoalYears.length

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t('goals.createGoal')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {remainingSlots > 0 ? t('goals.remainingSlots', { count: remainingSlots }) : t('goals.maxGoalsReached', { max: maxGoals })}
          </p>
        </div>
      </div>

      {/* Preset Years - Horizontal Scroll */}
      {remainingSlots > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {PRESET_YEARS.map((years) => (
            <GoalCreateCard
              key={years}
              years={years}
              disabled={isYearDisabled(years)}
              onClick={() => onCreateClick(years)}
              className="flex-shrink-0 w-28"
            />
          ))}

          {/* Custom card */}
          <GoalCreateCard
            custom
            disabled={remainingSlots <= 0}
            onClick={() => onCreateClick()}
            className="flex-shrink-0 w-28"
          />
        </div>
      )}

      {/* Full width button when only one slot left */}
      {remainingSlots === 1 && existingGoalYears.length === maxGoals - 1 && (
        <button
          onClick={() => onCreateClick()}
          disabled={remainingSlots <= 0}
          className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center justify-center gap-2"
        >
          <span className="text-2xl">✨</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {t('goals.createGoal')}
          </span>
        </button>
      )}
    </div>
  )
}
