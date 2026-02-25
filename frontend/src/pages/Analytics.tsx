import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearch } from '@tanstack/react-router'
import { BarChart3, PieChart, TrendingUp, Sparkles, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { IncomeExpenseBarChart } from '@/components/charts/IncomeExpenseBarChart'
import { CategoryBarChart } from '@/components/charts/CategoryBarChart'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { CashFlowSummary } from '@/components/charts/CashFlowSummary'
import { ZoomableChart } from '@/components/charts/ZoomableChart'
import { SpendingInsights } from '@/components/analytics/SpendingInsights'
import { AICategoryCleanup } from '@/components/analytics/AICategoryCleanup'
import {
  HeroMetrics,
  InsightCarousel,
  MonthPicker,
  PeriodToggle,
} from '@/components/analytics'
import type { PeriodType } from '@/components/analytics'
import { MonthlyReport } from '@/pages/MonthlyReport'
import { fetchAnalytics, fetchSpendingInsights } from '@/services/analytics-service'
import { fetchGoals } from '@/services/goal-service'
import { getCurrentMonthRange } from '@/utils/formatDate'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/utils/cn'

type AnalyticsTab = 'overview' | 'report'

// Helper function to calculate date range based on period and selected month
function getDateRangeForPeriod(
  period: PeriodType,
  selectedMonth: Date
): { start: string; end: string } {
  const monthEnd = endOfMonth(selectedMonth)
  const end = format(monthEnd > new Date() ? new Date() : monthEnd, 'yyyy-MM-dd')

  switch (period) {
    case 'current-month': {
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
      return { start, end }
    }
    case '3-months': {
      const start = format(subMonths(startOfMonth(selectedMonth), 2), 'yyyy-MM-dd')
      return { start, end }
    }
    case '6-months': {
      const start = format(subMonths(startOfMonth(selectedMonth), 5), 'yyyy-MM-dd')
      return { start, end }
    }
    case '1-year': {
      const start = format(subMonths(startOfMonth(selectedMonth), 11), 'yyyy-MM-dd')
      return { start, end }
    }
    default:
      return getCurrentMonthRange()
  }
}

export function Analytics() {
  const { t } = useTranslation('common')
  const searchParams = useSearch({ strict: false }) as Record<string, string>
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    searchParams?.tab === 'report' ? 'report' : 'overview'
  )
  const chartSectionRef = useRef<HTMLDivElement>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [activePeriod, setActivePeriod] = useState<PeriodType>('current-month')
  const [aiToolsExpanded, setAiToolsExpanded] = useState(false)

  // Calculate date range based on selected month and period
  const dateRange = getDateRangeForPeriod(activePeriod, selectedMonth)

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () => fetchAnalytics(dateRange),
  })

  // Fetch spending insights
  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: fetchSpendingInsights,
  })

  // Fetch goals for savings target
  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  // Get monthly savings target from first goal (if exists)
  const monthlySavingsTarget = goals && goals.length > 0
    ? Math.round(goals[0].target_amount / (goals[0].years * 12))
    : null

  // Handle period change
  const handlePeriodChange = (period: PeriodType) => {
    setActivePeriod(period)
  }

  // Handle month change
  const handleMonthChange = (date: Date) => {
    setSelectedMonth(date)
  }

  // Scroll to charts section
  const scrollToCharts = useCallback(() => {
    chartSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          {t('analytics.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('analytics.subtitle')}
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-1 inline-flex" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-5 py-2 text-sm font-semibold rounded-full transition-colors',
              activeTab === 'overview'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            {t('analytics.tabOverview', 'Overview')}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'report'}
            onClick={() => setActiveTab('report')}
            className={cn(
              'px-5 py-2 text-sm font-semibold rounded-full transition-colors',
              activeTab === 'report'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            {t('analytics.tabReport', 'Monthly Report')}
          </button>
        </div>
      </div>

      {/* Monthly Report Tab */}
      {activeTab === 'report' ? (
        <MonthlyReport embedded />
      ) : (
      <>
      {/* Date Selector - Mobile Optimized */}
      <div className="mb-6 space-y-3">
        <MonthPicker
          selectedMonth={selectedMonth}
          onChange={handleMonthChange}
          className="justify-center"
        />
        <div className="flex justify-center">
          <PeriodToggle
            selected={activePeriod}
            onChange={handlePeriodChange}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero Metrics - 2x2 Grid */}
          {analytics && (
            <HeroMetrics analytics={analytics} />
          )}

          {/* Insight Carousel */}
          {insightsData?.insights && insightsData.insights.length > 0 && (
            <InsightCarousel
              insights={insightsData.insights}
              onScrollToChart={scrollToCharts}
            />
          )}

          {/* Charts Section */}
          <div ref={chartSectionRef} className="space-y-6">
            {/* Income vs Expense Chart */}
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
                {analytics?.monthly_trends && analytics.monthly_trends.length > 0 ? (
                  <IncomeExpenseBarChart data={analytics.monthly_trends} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    {t('analytics.noData')}
                  </div>
                )}
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
                {analytics?.category_breakdown && analytics.category_breakdown.length > 0 ? (
                  <CategoryBarChart data={analytics.category_breakdown} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    {t('analytics.noData')}
                  </div>
                )}
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
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    {t('analytics.noData')}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* AI Tools - Collapsible Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-card">
            <button
              onClick={() => setAiToolsExpanded(!aiToolsExpanded)}
              className={cn(
                'w-full px-4 py-3.5 flex items-center justify-between',
                'bg-gray-50/80 dark:bg-gray-800/80',
                'text-left font-semibold text-gray-900 dark:text-gray-100'
              )}
            >
              <span className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                {t('analytics.aiTools')}
              </span>
              <ChevronDown className={cn(
                'w-4 h-4 text-gray-500 transition-transform duration-200',
                aiToolsExpanded && 'rotate-180'
              )} />
            </button>
            {aiToolsExpanded && (
              <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
                <AICategoryCleanup />
                <SpendingInsights />
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
