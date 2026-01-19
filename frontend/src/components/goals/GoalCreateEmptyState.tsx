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
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('goals.createGoal')}</h2>
        <p className="text-gray-600">
          {t('goals.selectPeriod')}
          {remainingSlots > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              （{t('goals.remainingSlots', { count: remainingSlots })}）
            </span>
          )}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Preset year cards */}
        {PRESET_YEARS.map((years) => (
          <GoalCreateCard
            key={years}
            years={years}
            disabled={isYearDisabled(years)}
            onClick={() => onCreateClick(years)}
          />
        ))}

        {/* Custom card */}
        <GoalCreateCard
          custom
          disabled={remainingSlots <= 0}
          onClick={() => onCreateClick()}
        />
      </div>

      {/* Footer info */}
      {remainingSlots <= 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {t('goals.maxGoalsReached', { max: maxGoals })}
          </p>
        </div>
      )}
    </div>
  )
}
