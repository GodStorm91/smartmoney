import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { GoalAchievabilityCard } from '@/components/goals/GoalAchievabilityCard'
import { CategoryBreakdownList } from '@/components/financial/CategoryBreakdownList'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { TrendChartCard } from '@/components/dashboard/TrendChartCard'
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard'
import { NetWorthCard } from '@/components/dashboard/NetWorthCard'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatMonth } from '@/utils/formatDate'
import { fetchDashboardSummary, fetchMonthlyTrends, fetchCategoryBreakdown } from '@/services/analytics-service'
import { fetchGoals, fetchGoalProgress } from '@/services/goal-service'
import { ProxyReceivablesWidget } from '@/components/proxy'

export function Dashboard() {
  const { t } = useTranslation('common')

  // Fetch dashboard data
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => fetchDashboardSummary(),
  })

  const { data: monthlyTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['monthly-trends', 12],
    queryFn: () => fetchMonthlyTrends(12),
  })

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['category-breakdown'],
    queryFn: () => fetchCategoryBreakdown(),
  })

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  // Fetch goal progress with achievability for each goal
  const { data: goalsProgress, isLoading: goalsProgressLoading } = useQuery({
    queryKey: ['goals-progress', goals?.map(g => g.id)],
    queryFn: async () => {
      if (!goals || goals.length === 0) return []
      return Promise.all(
        goals.map(goal => fetchGoalProgress(goal.id, true))
      )
    },
    enabled: !!goals && goals.length > 0,
  })

  const isLoading = summaryLoading || trendsLoading || categoriesLoading || goalsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('dashboard.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.subtitle', { month: formatMonth(new Date()) })}</p>
      </div>

      {/* Onboarding Checklist for new users */}
      <OnboardingChecklist />

      {/* Net Worth Hero Card */}
      <NetWorthCard
        monthlyNet={summary?.net}
        monthlyNetChange={summary?.net_change}
      />

      {/* KPI Summary Cards */}
      <DashboardKPIs summary={summary} />

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <TrendChartCard data={monthlyTrends} />
        <QuickActionsCard />
      </div>

      {/* Category Breakdown & Goals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">{t('dashboard.categoryBreakdown')}</h3>
          {categories && categories.length > 0 ? (
            <>
              <CategoryBreakdownList categories={categories} maxItems={4} />
              <Link
                to="/analytics"
                className="mt-6 block text-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                {t('dashboard.viewAllCategories')}
              </Link>
            </>
          ) : (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">{t('dashboard.noData')}</p>
          )}
        </Card>

        {/* Goals Achievability */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.goalAchievability')}</h3>
            <Link
              to="/goals"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {t('dashboard.viewDetails')}
            </Link>
          </div>

          {goalsProgress && goalsProgress.length > 0 && !goalsProgressLoading ? (
            <div className="space-y-6">
              {goalsProgress.slice(0, 3).map((progress) => (
                progress.achievability && (
                  <GoalAchievabilityCard
                    key={progress.goal_id}
                    goalId={progress.goal_id}
                    goalName={t('dashboard.yearGoal', { years: progress.years })}
                    achievability={progress.achievability}
                    targetAmount={progress.target_amount}
                    currentAmount={progress.total_saved}
                  />
                )
              ))}
            </div>
          ) : goals && goals.length > 0 ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">{t('dashboard.noGoals')}</p>
          )}
        </Card>
      </div>

      {/* Proxy Receivables Widget */}
      <div className="mt-6">
        <ProxyReceivablesWidget />
      </div>
    </div>
  )
}
