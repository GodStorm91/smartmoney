import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PieChart, Target } from 'lucide-react'
import { GoalAchievabilityCard } from '@/components/goals/GoalAchievabilityCard'
import { CategoryBreakdownList } from '@/components/financial/CategoryBreakdownList'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { TrendChartCard } from '@/components/dashboard/TrendChartCard'
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard'
import { NetWorthCard } from '@/components/dashboard/NetWorthCard'
import { FinancialHealthCard } from '@/components/dashboard/FinancialHealthCard'
import { SpendingInsightsCard } from '@/components/dashboard/SpendingInsightsCard'
import { MonthComparisonCard } from '@/components/dashboard/MonthComparisonCard'
import { SmartAlertsCard } from '@/components/dashboard/SmartAlertsCard'
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar'
import { CashFlowForecastCard } from '@/components/dashboard/CashFlowForecastCard'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { formatMonth } from '@/utils/formatDate'
import { fetchDashboardSummary, fetchMonthlyTrends, fetchCategoryBreakdown } from '@/services/analytics-service'
import { fetchGoals, fetchGoalProgress } from '@/services/goal-service'
import { ProxyReceivablesWidget } from '@/components/proxy'

export function Dashboard() {
  const { t } = useTranslation('common')

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
    return <DashboardSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-8 pb-28">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('dashboard.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('dashboard.subtitle', { month: formatMonth(new Date()) })}
        </p>
      </div>

      <OnboardingChecklist />

      <section className="mt-6">
        <NetWorthCard
          monthlyNet={summary?.net}
          monthlyNetChange={summary?.net_change}
        />
      </section>

      <section className="mt-6">
        <QuickActionsBar />
      </section>

      {monthlyTrends && monthlyTrends.length > 0 && (
        <section className="mt-6">
          <SmartAlertsCard
            income={monthlyTrends[monthlyTrends.length - 1]?.income || 0}
            expense={monthlyTrends[monthlyTrends.length - 1]?.expenses || 0}
            savingsRate={
              monthlyTrends[monthlyTrends.length - 1]?.income > 0
                ? ((monthlyTrends[monthlyTrends.length - 1]?.income - monthlyTrends[monthlyTrends.length - 1]?.expenses) /
                    monthlyTrends[monthlyTrends.length - 1]?.income) * 100
                : 0
            }
          />
        </section>
      )}

      <section className="mt-6">
        <CashFlowForecastCard />
      </section>

      <section className="mt-6">
        <DashboardKPIs summary={summary} />
      </section>

      {monthlyTrends && monthlyTrends.length > 0 && (
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FinancialHealthCard
            income={monthlyTrends[monthlyTrends.length - 1]?.income || 0}
            expense={monthlyTrends[monthlyTrends.length - 1]?.expenses || 0}
            goals={goalsProgress?.map(g => ({ progress: (g.total_saved / g.target_amount) * 100 })) || []}
          />
          <SpendingInsightsCard
            categories={categories || []}
            income={monthlyTrends[monthlyTrends.length - 1]?.income || 0}
            expense={monthlyTrends[monthlyTrends.length - 1]?.expenses || 0}
            previousExpense={monthlyTrends.length > 1 ? monthlyTrends[monthlyTrends.length - 2]?.expenses : undefined}
          />
        </section>
      )}

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendChartCard data={monthlyTrends} className="lg:col-span-2" />
        <div className="space-y-4">
          {monthlyTrends && monthlyTrends.length > 1 && (
            <MonthComparisonCard
              currentMonth={monthlyTrends[monthlyTrends.length - 1]}
              previousMonth={monthlyTrends[monthlyTrends.length - 2]}
            />
          )}
          <QuickActionsCard />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('dashboard.categoryBreakdown')}
          </h3>
          {categories && categories.length > 0 ? (
            <>
              <CategoryBreakdownList categories={categories} maxItems={4} />
              <Link
                to="/analytics"
                className="mt-4 block text-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {t('dashboard.viewAllCategories')}
              </Link>
            </>
          ) : (
            <EmptyState
              icon={<PieChart />}
              title={t('dashboard.noCategories', 'No spending data yet')}
              description={t('dashboard.noCategoriesDescription', 'Add transactions to see your spending breakdown')}
              compact
              action={
                <Link
                  to="/transactions"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {t('dashboard.addTransaction', 'Add transaction')}
                </Link>
              }
            />
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('dashboard.goalAchievability')}
            </h3>
            <Link
              to="/goals"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {t('dashboard.viewDetails')}
            </Link>
          </div>

          {goalsProgress && goalsProgress.length > 0 && !goalsProgressLoading ? (
            <div className="space-y-4">
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
            <EmptyState
              icon={<Target />}
              title={t('dashboard.noGoals', 'No goals yet')}
              description={t('dashboard.noGoalsDescription', 'Set financial goals to track your progress')}
              compact
              action={
                <Link
                  to="/goals"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {t('dashboard.createGoal', 'Create a goal')}
                </Link>
              }
            />
          )}
        </Card>
      </section>

      <section className="mt-6">
        <ProxyReceivablesWidget />
      </section>
    </div>
  )
}
