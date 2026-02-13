import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Target, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fetchGoals, fetchGoalProgress } from '@/services/goal-service'
import { cn } from '@/utils/cn'

interface GoalImpactCardProps {
  monthlyDifference: number
}

export function GoalImpactCard({ monthlyDifference }: GoalImpactCardProps) {
  const { t } = useTranslation('common')

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  const { data: goalsProgress } = useQuery({
    queryKey: ['goals-progress-relocation', goals?.map((g) => g.id)],
    queryFn: async () => {
      if (!goals?.length) return []
      return Promise.all(goals.map((g) => fetchGoalProgress(g.id, true, 3)))
    },
    enabled: !!goals?.length,
  })

  if (!goalsProgress?.length || monthlyDifference === 0) return null

  const isSaving = monthlyDifference < 0
  const savedPerMonth = Math.abs(monthlyDifference)

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('relocation.goalImpact')}
        </h2>
      </div>

      <div className="space-y-3">
        {goalsProgress.map((progress) => {
          if (!progress.achievability) return null
          const remaining = progress.target_amount - progress.total_saved
          if (remaining <= 0) return null

          const currentMonths = progress.achievability.current_monthly_net > 0
            ? Math.ceil(remaining / progress.achievability.current_monthly_net)
            : Infinity

          const adjustedMonthly = isSaving
            ? progress.achievability.current_monthly_net + savedPerMonth
            : progress.achievability.current_monthly_net - savedPerMonth

          const newMonths = adjustedMonthly > 0
            ? Math.ceil(remaining / adjustedMonthly)
            : Infinity

          const monthsDiff = currentMonths - newMonths
          const accelerating = monthsDiff > 0

          return (
            <div
              key={progress.goal_id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {progress.name || t('goals.yearGoal', { years: progress.years })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {monthsDiff !== 0 && isFinite(monthsDiff) ? (
                    <span className={cn(
                      accelerating
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    )}>
                      {accelerating
                        ? t('relocation.goalFaster', { months: Math.abs(monthsDiff) })
                        : t('relocation.goalSlower', { months: Math.abs(monthsDiff) })}
                    </span>
                  ) : (
                    t('relocation.goalNoChange')
                  )}
                </p>
              </div>
              <Badge variant={accelerating ? 'success' : monthsDiff < 0 ? 'error' : 'default'}>
                <span className="flex items-center gap-1">
                  {accelerating
                    ? <TrendingUp className="w-3 h-3" />
                    : monthsDiff < 0
                      ? <TrendingDown className="w-3 h-3" />
                      : null}
                  {isFinite(newMonths)
                    ? t('relocation.monthsRemaining', { months: newMonths })
                    : '-'}
                </span>
              </Badge>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
