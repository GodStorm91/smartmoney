import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { IncomeExpenseBarChart } from '@/components/charts/IncomeExpenseBarChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { fetchAnalytics } from '@/services/analytics-service'
import { getCurrentMonthRange } from '@/utils/formatDate'

export function Analytics() {
  const monthRange = getCurrentMonthRange()
  const [dateRange, setDateRange] = useState({ start: monthRange.start, end: monthRange.end })

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () => fetchAnalytics(dateRange),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">分析</h2>
        <p className="text-gray-600">収支の詳細な分析とトレンド</p>
      </div>

      {/* Date Range Selector */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <Button variant="primary">今月</Button>
            <Button variant="outline">3ヶ月</Button>
            <Button variant="outline">6ヶ月</Button>
            <Button variant="outline">1年</Button>
          </div>
          <div className="flex gap-2 items-center">
            <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
            <span>〜</span>
            <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Income vs Expense Chart */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">収入 vs 支出</h3>
            <div className="h-80">
              {analytics?.monthly_trends && analytics.monthly_trends.length > 0 ? (
                <IncomeExpenseBarChart data={analytics.monthly_trends} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">データがありません</div>
              )}
            </div>
          </Card>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">カテゴリー別内訳</h3>
              <div className="h-80">
                {analytics?.category_breakdown && analytics.category_breakdown.length > 0 ? (
                  <CategoryPieChart data={analytics.category_breakdown} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">データがありません</div>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">月次キャッシュフロー</h3>
              <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-400">月次詳細チャート (実装予定)</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
