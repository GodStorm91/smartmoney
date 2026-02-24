import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Target, TrendingUp, TrendingDown } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { GoalAchievabilityCard } from '@/components/goals/GoalAchievabilityCard'
import { GoalCreateEmptyState } from '@/components/goals/GoalCreateEmptyState'
import { GoalCreateModal } from '@/components/goals/GoalCreateModal'
import { fetchGoals, fetchGoalProgress, deleteGoal } from '@/services/goal-service'
import { fetchCategoryBreakdown } from '@/services/analytics-service'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { formatCurrencyCompactPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'

const MAX_GOALS = 4
const DEFAULT_TREND_MONTHS = 3

export function Goals() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedYears, setSelectedYears] = useState<number | undefined>()
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null)
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()

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

  // Calculate top expense category
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

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!goalsProgress?.length) return null
    const totalTarget = goalsProgress.reduce((sum, g) => sum + g.target_amount, 0)
    const totalSaved = goalsProgress.reduce((sum, g) => sum + g.total_saved, 0)
    const avgProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0
    const onTrackCount = goalsProgress.filter(g =>
      g.achievability && g.achievability.current_monthly_net >= g.achievability.required_monthly
    ).length
    return {
      totalTarget,
      totalSaved,
      avgProgress,
      onTrackCount,
      totalCount: goalsProgress.length,
    }
  }, [goalsProgress])

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
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />
              {t('goals.title')}
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {goalsProgress?.length || 0}/{MAX_GOALS}
            </span>
          </div>

          {/* Overall Progress Summary */}
          {overallStats && overallStats.totalCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatCurrencyCompactPrivacy(overallStats.totalSaved, currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-500">
                    {formatCurrencyCompactPrivacy(overallStats.totalTarget, currency, exchangeRates?.rates || {}, true, isPrivacyMode)}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-500',
                      overallStats.avgProgress >= 100
                        ? 'bg-emerald-500'
                        : overallStats.avgProgress >= 50
                        ? 'bg-primary-500'
                        : 'bg-amber-500'
                    )}
                    style={{ width: `${Math.min(100, overallStats.avgProgress)}%` }}
                  />
                </div>
              </div>
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full',
                overallStats.onTrackCount === overallStats.totalCount
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : overallStats.onTrackCount > 0
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
              )}>
                {overallStats.onTrackCount === overallStats.totalCount ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : overallStats.onTrackCount > 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : null}
                {overallStats.onTrackCount}/{overallStats.totalCount}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : goalsProgress && goalsProgress.length > 0 ? (
          <div className="space-y-4">
            {goalsProgress.map((progress, idx) => (
              progress.achievability && (
                <div
                  key={progress.goal_id}
                  className="animate-stagger-in"
                  style={{ '--stagger-index': idx } as React.CSSProperties}
                >
                  <GoalAchievabilityCard
                    goalId={progress.goal_id}
                    goalName={t('goals.yearGoal', { years: progress.years })}
                    achievability={progress.achievability}
                    targetAmount={progress.target_amount}
                    currentAmount={progress.total_saved}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    topExpenseCategory={topExpenseCategory}
                  />
                </div>
              )
            ))}

            {canCreateMore && (
              <div className="mt-6">
                <GoalCreateEmptyState
                  onCreateClick={handleCreateClick}
                  existingGoalYears={existingGoalYears}
                  maxGoals={MAX_GOALS}
                />
              </div>
            )}
          </div>
        ) : goals && goals.length > 0 ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <GoalCreateEmptyState
            onCreateClick={handleCreateClick}
            existingGoalYears={[]}
            maxGoals={MAX_GOALS}
          />
        )}
      </div>

      {/* FAB for quick add */}
      {canCreateMore && typeof document !== 'undefined' && createPortal(
        <button
          onClick={() => handleCreateClick()}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-all md:hidden"
          aria-label={t('goals.createGoal')}
        >
          <Plus size={28} />
        </button>,
        document.body
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
