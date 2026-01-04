import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GoalAchievabilityCard } from '@/components/goals/GoalAchievabilityCard'
import { GoalCreateEmptyState } from '@/components/goals/GoalCreateEmptyState'
import { GoalCreateModal } from '@/components/goals/GoalCreateModal'
import { fetchGoals, fetchGoalProgress, deleteGoal } from '@/services/goal-service'
import { fetchCategoryBreakdown } from '@/services/analytics-service'

const MAX_GOALS = 4
const DEFAULT_TREND_MONTHS = 3

export function Goals() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedYears, setSelectedYears] = useState<number | undefined>()
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null)

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  // Fetch goal progress with achievability for each goal
  const { data: goalsProgress, isLoading: goalsProgressLoading } = useQuery({
    queryKey: ['goals-progress-full', goals?.map(g => g.id), DEFAULT_TREND_MONTHS],
    queryFn: async () => {
      if (!goals || goals.length === 0) return []
      return Promise.all(
        goals.map(goal => fetchGoalProgress(goal.id, true, DEFAULT_TREND_MONTHS))
      )
    },
    enabled: !!goals && goals.length > 0,
  })

  // Fetch category breakdown for spending tips
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - DEFAULT_TREND_MONTHS)
  const { data: categoryBreakdown } = useQuery({
    queryKey: ['category-breakdown-goals', DEFAULT_TREND_MONTHS],
    queryFn: () => fetchCategoryBreakdown({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    }),
    enabled: !!goals && goals.length > 0,
  })

  // Calculate top expense category (monthly average, excluding transfers)
  const topExpenseCategory = useMemo(() => {
    if (!categoryBreakdown?.length) return undefined
    const sorted = [...categoryBreakdown]
      .filter(c => c.category.toLowerCase() !== 'transfer')
      .sort((a, b) => b.amount - a.amount)
    if (!sorted[0]) return undefined
    return {
      name: sorted[0].category,
      monthlyAmount: sorted[0].amount / DEFAULT_TREND_MONTHS,
    }
  }, [categoryBreakdown])

  // Delete goal mutation
  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals-progress-full'] })
      queryClient.invalidateQueries({ queryKey: ['has-emergency-fund'] })
    },
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

  const handleDelete = (goalId: number) => {
    deleteMutation.mutate(goalId)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedYears(undefined)
    setEditingGoalId(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('goals.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('goals.subtitle')}</p>
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
                  onDelete={handleDelete}
                  topExpenseCategory={topExpenseCategory}
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
