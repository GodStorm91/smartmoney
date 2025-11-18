import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GoalAchievabilityCard } from '@/components/goals/GoalAchievabilityCard'
import { GoalCreateEmptyState } from '@/components/goals/GoalCreateEmptyState'
import { GoalCreateModal } from '@/components/goals/GoalCreateModal'
import { fetchGoals, fetchGoalProgress } from '@/services/goal-service'

const MAX_GOALS = 4

export function Goals() {
  const { t } = useTranslation('common')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedYears, setSelectedYears] = useState<number | undefined>()
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null)

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  // Fetch goal progress with achievability for each goal
  const { data: goalsProgress, isLoading: goalsProgressLoading } = useQuery({
    queryKey: ['goals-progress-full', goals?.map(g => g.id)],
    queryFn: async () => {
      if (!goals || goals.length === 0) return []
      return Promise.all(
        goals.map(goal => fetchGoalProgress(goal.id, true))
      )
    },
    enabled: !!goals && goals.length > 0,
  })

  const isLoading = goalsLoading || goalsProgressLoading
  const existingGoalYears = goals?.map(g => g.years) || []
  const canCreateMore = existingGoalYears.length < MAX_GOALS

  const handleCreateClick = (years?: number) => {
    setSelectedYears(years)
    setEditingGoalId(null)
    setIsModalOpen(true)
  }

  const handleEdit = (goalId: number) => {
    setEditingGoalId(goalId)
    setSelectedYears(undefined)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedYears(undefined)
    setEditingGoalId(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('goals.title')}</h2>
        <p className="text-gray-600">{t('goals.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : goalsProgress && goalsProgress.length > 0 ? (
        <>
          <div className="space-y-6">
            {goalsProgress.map((progress) => (
              progress.achievability && (
                <GoalAchievabilityCard
                  key={progress.goal_id}
                  goalId={progress.goal_id}
                  goalName={t('goals.yearGoal', { years: progress.years })}
                  achievability={progress.achievability}
                  targetAmount={progress.target_amount}
                  currentAmount={progress.total_saved}
                  onEdit={handleEdit}
                />
              )
            ))}
          </div>

          {canCreateMore && (
            <div className="mt-12">
              <GoalCreateEmptyState
                onCreateClick={handleCreateClick}
                existingGoalYears={existingGoalYears}
                maxGoals={MAX_GOALS}
              />
            </div>
          )}
        </>
      ) : goals && goals.length > 0 ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <GoalCreateEmptyState
          onCreateClick={handleCreateClick}
          existingGoalYears={[]}
          maxGoals={MAX_GOALS}
        />
      )}

      <GoalCreateModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        preselectedYears={selectedYears}
        editingGoalId={editingGoalId}
      />
    </div>
  )
}
