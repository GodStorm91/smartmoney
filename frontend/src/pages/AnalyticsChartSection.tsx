/**
 * The three main chart cards on the Analytics overview tab:
 *   1. Income vs Expense bar chart
 *   2. Category breakdown bar chart
 *   3. Monthly cash-flow trend / summary
 */
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, PieChart, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { IncomeExpenseBarChart } from '@/components/charts/IncomeExpenseBarChart'
import { CategoryBarChart } from '@/components/charts/CategoryBarChart'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { CashFlowSummary } from '@/components/charts/CashFlowSummary'
import { ZoomableChart } from '@/components/charts/ZoomableChart'
import type { Analytics } from '@/types'

interface Props {
  analytics: Analytics | undefined
  monthlySavingsTarget: number | null
}

export const AnalyticsChartSection = forwardRef<HTMLDivElement, Props>(
  ({ analytics, monthlySavingsTarget }, ref) => {
    const { t } = useTranslation('common')
    const noData = (
      <div className="flex items-center justify-center h-full text-gray-400">
        {t('analytics.noData')}
      </div>
    )

    return (
      <div ref={ref} className="space-y-6">
        {/* Income vs Expense */}
        <Card className="shadow-card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('analytics.incomeVsExpense')}
            </h3>
          </div>
          <ZoomableChart className="h-64 sm:h-80">
            {analytics?.monthly_trends && analytics.monthly_trends.length > 0
              ? <IncomeExpenseBarChart data={analytics.monthly_trends} />
              : noData}
          </ZoomableChart>
        </Card>

        {/* Category Breakdown */}
        <Card className="shadow-card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('analytics.categoryBreakdown')}
            </h3>
          </div>
          <ZoomableChart className="h-64 sm:h-80">
            {analytics?.category_breakdown && analytics.category_breakdown.length > 0
              ? <CategoryBarChart data={analytics.category_breakdown} />
              : noData}
          </ZoomableChart>
        </Card>

        {/* Monthly Cash Flow */}
        <Card className="shadow-card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-lg bg-net-100 dark:bg-net-900/30">
              <TrendingUp className="w-4 h-4 text-net-600 dark:text-net-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('analytics.monthlyCashFlow')}
            </h3>
          </div>
          <div className="h-64 sm:h-80">
            {analytics?.monthly_trends && analytics.monthly_trends.length > 0 ? (
              analytics.monthly_trends.length < 3 ? (
                <CashFlowSummary
                  data={analytics.monthly_trends}
                  savingsGoal={monthlySavingsTarget}
                />
              ) : (
                <ZoomableChart className="h-full">
                  <TrendLineChart data={analytics.monthly_trends} dataKey="net" />
                </ZoomableChart>
              )
            ) : noData}
          </div>
        </Card>
      </div>
    )
  }
)

AnalyticsChartSection.displayName = 'AnalyticsChartSection'
