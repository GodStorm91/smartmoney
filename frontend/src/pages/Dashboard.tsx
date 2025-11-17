import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { GoalProgressCard } from '@/components/financial/GoalProgressCard'
import { CategoryBreakdownList } from '@/components/financial/CategoryBreakdownList'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { TrendChartCard } from '@/components/dashboard/TrendChartCard'
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatMonth } from '@/utils/formatDate'
import { fetchDashboardSummary, fetchMonthlyTrends, fetchCategoryBreakdown } from '@/services/analytics-service'
import { fetchGoals } from '@/services/goal-service'

export function Dashboard() {
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">ダッシュボード</h2>
        <p className="text-gray-600">{formatMonth(new Date())}の財務状況</p>
      </div>

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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">カテゴリー別支出</h3>
          {categories && categories.length > 0 ? (
            <>
              <CategoryBreakdownList categories={categories} maxItems={4} />
              <Link
                to="/analytics"
                className="mt-6 block text-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                すべてのカテゴリーを表示 →
              </Link>
            </>
          ) : (
            <p className="text-center text-gray-400 py-8">データがありません</p>
          )}
        </Card>

        {/* Goals Progress */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">目標の進捗</h3>
            <Link
              to="/goals"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              詳細 →
            </Link>
          </div>

          {goals && goals.length > 0 ? (
            <div className="space-y-6">
              {goals.slice(0, 3).map((goal) => (
                <GoalProgressCard key={goal.id} goal={goal} compact />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">目標が設定されていません</p>
          )}
        </Card>
      </div>
    </div>
  )
}
