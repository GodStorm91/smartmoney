import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { IncomeExpenseBarChart } from '@/components/charts/IncomeExpenseBarChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { fetchAnalytics } from '@/services/analytics-service'
import { getCurrentMonthRange } from '@/utils/formatDate'
import { format, subMonths } from 'date-fns'

type TimePeriod = 'current-month' | '3-months' | '6-months' | '1-year' | 'custom'

// Helper function to calculate date range based on period
function getDateRangeForPeriod(period: TimePeriod): { start: string; end: string } {
  const today = new Date()
  const end = format(today, 'yyyy-MM-dd')

  switch (period) {
    case 'current-month':
      return getCurrentMonthRange()
    case '3-months': {
      const start = format(subMonths(today, 3), 'yyyy-MM-dd')
      return { start, end }
    }
    case '6-months': {
      const start = format(subMonths(today, 6), 'yyyy-MM-dd')
      return { start, end }
    }
    case '1-year': {
      const start = format(subMonths(today, 12), 'yyyy-MM-dd')
      return { start, end }
    }
    default:
      return getCurrentMonthRange()
  }
}

export function Analytics() {
  const { t } = useTranslation('common')
  const monthRange = getCurrentMonthRange()
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('current-month')
  const [dateRange, setDateRange] = useState({ start: monthRange.start, end: monthRange.end })

  // Handle time period button clicks
  const handlePeriodChange = (period: TimePeriod) => {
    setActivePeriod(period)
    const newRange = getDateRangeForPeriod(period)
    setDateRange(newRange)
  }

  // Handle custom date input changes
  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setActivePeriod('custom')
    setDateRange({ ...dateRange, [field]: value })
  }

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () => fetchAnalytics(dateRange),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('analytics.title')}</h2>
        <p className="text-gray-600">{t('analytics.subtitle')}</p>
      </div>

      {/* Date Range Selector */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={activePeriod === 'current-month' ? 'primary' : 'outline'}
              onClick={() => handlePeriodChange('current-month')}
            >
              {t('analytics.currentMonth')}
            </Button>
            <Button
              variant={activePeriod === '3-months' ? 'primary' : 'outline'}
              onClick={() => handlePeriodChange('3-months')}
            >
              {t('analytics.3months')}
            </Button>
            <Button
              variant={activePeriod === '6-months' ? 'primary' : 'outline'}
              onClick={() => handlePeriodChange('6-months')}
            >
              {t('analytics.6months')}
            </Button>
            <Button
              variant={activePeriod === '1-year' ? 'primary' : 'outline'}
              onClick={() => handlePeriodChange('1-year')}
            >
              {t('analytics.1year')}
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg"
              value={dateRange.start}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
            />
            <span>〜</span>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg"
              value={dateRange.end}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Income vs Expense Chart */}
          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('analytics.incomeVsExpense')}</h3>
            <div className="h-80">
              {analytics?.monthly_trends && analytics.monthly_trends.length > 0 ? (
                <IncomeExpenseBarChart data={analytics.monthly_trends} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">{t('analytics.noData')}</div>
              )}
            </div>
          </Card>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('analytics.categoryBreakdown')}</h3>
              <div className="h-80">
                {analytics?.category_breakdown && analytics.category_breakdown.length > 0 ? (
                  <CategoryPieChart data={analytics.category_breakdown} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">{t('analytics.noData')}</div>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('analytics.monthlyCashFlow')}</h3>
              <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-400">{t('analytics.comingSoon')}</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
