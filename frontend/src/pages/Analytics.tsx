/**
 * Analytics page — overview tab + monthly report tab.
 *
 * Sub-modules:
 *   analytics-date-utils   : getDateRangeForPeriod pure helper
 *   AnalyticsChartSection  : income/expense, category, cashflow chart cards
 *   AnalyticsAiToolsSection: collapsible AI Tools panel
 */
import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearch } from '@tanstack/react-router'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { HeroMetrics, InsightCarousel, MonthPicker, PeriodToggle } from '@/components/analytics'
import type { PeriodType } from '@/components/analytics'
import { SpendingHeatmap } from '@/components/analytics/SpendingHeatmap'
import { YoYComparisonChart } from '@/components/analytics/YoYComparisonChart'
import { MonthlyReport } from '@/pages/MonthlyReport'
import { AnalyticsChartSection } from '@/pages/AnalyticsChartSection'
import { AnalyticsAiToolsSection } from '@/pages/AnalyticsAiToolsSection'
import { getDateRangeForPeriod } from '@/pages/analytics-date-utils'
import { fetchAnalytics, fetchSpendingInsights } from '@/services/analytics-service'
import { fetchGoals } from '@/services/goal-service'
import { cn } from '@/utils/cn'

type AnalyticsTab = 'overview' | 'report'

export function Analytics() {
  const { t } = useTranslation('common')
  const searchParams = useSearch({ strict: false }) as Record<string, string>
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    searchParams?.tab === 'report' ? 'report' : 'overview'
  )
  const chartSectionRef = useRef<HTMLDivElement>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [activePeriod, setActivePeriod] = useState<PeriodType>('current-month')

  const dateRange = getDateRangeForPeriod(activePeriod, selectedMonth)

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () => fetchAnalytics(dateRange),
  })

  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: fetchSpendingInsights,
  })

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  const monthlySavingsTarget =
    goals && goals.length > 0
      ? Math.round(goals[0].target_amount / (goals[0].years * 12))
      : null

  const scrollToCharts = useCallback(() => {
    chartSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const tabButtonClass = (tab: AnalyticsTab) =>
    cn(
      'px-5 py-2 text-sm font-semibold rounded-full transition-colors',
      activeTab === tab
        ? 'bg-primary-600 text-white shadow-md'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
    )

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          {t('analytics.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('analytics.subtitle')}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-1 inline-flex" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={tabButtonClass('overview')}
          >
            {t('analytics.tabOverview', 'Overview')}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'report'}
            onClick={() => setActiveTab('report')}
            className={tabButtonClass('report')}
          >
            {t('analytics.tabReport', 'Monthly Report')}
          </button>
        </div>
      </div>

      {/* Monthly Report tab */}
      {activeTab === 'report' ? (
        <MonthlyReport embedded />
      ) : (
        <>
          {/* Date selector */}
          <div className="mb-6 space-y-3">
            <MonthPicker
              selectedMonth={selectedMonth}
              onChange={setSelectedMonth}
              className="justify-center"
            />
            <div className="flex justify-center">
              <PeriodToggle selected={activePeriod} onChange={setActivePeriod} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hero metrics 2×2 grid */}
              {analytics && <HeroMetrics analytics={analytics} />}

              {/* Insight carousel */}
              {insightsData?.insights && insightsData.insights.length > 0 && (
                <InsightCarousel
                  insights={insightsData.insights}
                  onScrollToChart={scrollToCharts}
                />
              )}

              {/* Three main chart cards */}
              <AnalyticsChartSection
                ref={chartSectionRef}
                analytics={analytics}
                monthlySavingsTarget={monthlySavingsTarget}
              />

              {/* Spending heatmap */}
              <SpendingHeatmap startDate={dateRange.start} endDate={dateRange.end} />

              {/* Year-over-year comparison */}
              <YoYComparisonChart />

              {/* AI tools (collapsible) */}
              <AnalyticsAiToolsSection />
            </div>
          )}
        </>
      )}
    </div>
  )
}
