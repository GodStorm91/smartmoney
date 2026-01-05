import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Calendar, CalendarClock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { fetchRecurringMonthlySummary } from '@/services/recurring-service'
import type { Budget, BudgetTracking } from '@/types'

interface BudgetProjectionCardProps {
  budget: Budget
  tracking: BudgetTracking
}

export function BudgetProjectionCard({ budget, tracking }: BudgetProjectionCardProps) {
  const { t } = useTranslation('common')

  // Fetch recurring monthly summary for smarter projection
  const { data: recurringSummary } = useQuery({
    queryKey: ['recurring-monthly-summary', budget.month],
    queryFn: () => fetchRecurringMonthlySummary(budget.month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const projection = useMemo(() => {
    // Parse month from budget (format: "YYYY-MM")
    const [year, month] = budget.month.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysElapsed = daysInMonth - tracking.days_remaining
    const progressPercent = Math.round((daysElapsed / daysInMonth) * 100)

    // Get recurring data (default to 0 if not loaded yet)
    const paidRecurring = recurringSummary?.paid_this_month ?? 0
    const upcomingBills = recurringSummary?.upcoming_this_month ?? 0
    const upcomingCount = recurringSummary?.upcoming_count ?? 0

    // Avoid division by zero
    if (daysElapsed <= 0) {
      return {
        daysInMonth,
        daysElapsed: 0,
        progressPercent: 0,
        dailyAvg: 0,
        variableSpending: 0,
        variableProjection: 0,
        upcomingBills,
        upcomingCount,
        projectedSpending: upcomingBills,
        projectedSavings: budget.monthly_income - upcomingBills,
        isOnTrack: budget.monthly_income - upcomingBills >= (budget.savings_target || 0),
      }
    }

    // Recurring-aware projection formula:
    // Variable Spent = Total Spent - Paid Recurring
    // Variable Daily = Variable Spent / Days Elapsed
    // Variable Projection = Variable Spent + (Variable Daily × Remaining Days)
    // Total Projected = Variable Projection + Upcoming Bills
    const variableSpent = Math.max(0, tracking.total_spent - paidRecurring)
    const variableDaily = variableSpent / daysElapsed
    const variableRemaining = variableDaily * tracking.days_remaining
    const variableProjection = variableSpent + variableRemaining
    const projectedSpending = variableProjection + upcomingBills

    const dailyAvg = tracking.total_spent / daysElapsed
    const projectedSavings = budget.monthly_income - projectedSpending

    return {
      daysInMonth,
      daysElapsed,
      progressPercent,
      dailyAvg: Math.round(dailyAvg),
      variableSpending: Math.round(variableSpent),
      variableProjection: Math.round(variableProjection),
      upcomingBills,
      upcomingCount,
      projectedSpending: Math.round(projectedSpending),
      projectedSavings: Math.round(projectedSavings),
      isOnTrack: projectedSavings >= (budget.savings_target || 0),
    }
  }, [budget, tracking, recurringSummary])

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-500" />
        {t('budget.projection.title', 'Spending Projection')}
      </h3>

      {/* Month Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">
            {t('budget.projection.monthProgress', 'Month Progress')}
          </span>
          <span className="font-medium">
            {projection.daysElapsed} / {projection.daysInMonth} {t('budget.projection.days', 'days')}
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${projection.progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
          {projection.progressPercent}% {t('budget.projection.elapsed', 'elapsed')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('budget.projection.spentSoFar', 'Spent so far')}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(tracking.total_spent)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('budget.projection.dailyAvg', 'Daily average')}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(projection.dailyAvg)}
          </p>
        </div>
      </div>

      {/* Projection Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          {t('budget.projection.projectedByMonthEnd', 'Projected by month end')}
        </p>

        <div className="space-y-3">
          {/* Variable spending breakdown */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {t('budget.projection.variableSpending', 'Variable spending')}
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {formatCurrency(projection.variableProjection)}
            </span>
          </div>

          {/* Upcoming bills */}
          {projection.upcomingBills > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <CalendarClock className="w-4 h-4" />
                {t('budget.projection.upcomingBills', 'Upcoming bills')}
                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                  {projection.upcomingCount}
                </span>
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {formatCurrency(projection.upcomingBills)}
              </span>
            </div>
          )}

          {/* Total projected line */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              {t('budget.projection.totalProjected', 'Total projected')}
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(projection.projectedSpending)}
            </span>
          </div>

          <div className={cn(
            "flex justify-between items-center p-3 rounded-lg",
            projection.isOnTrack
              ? "bg-green-50 dark:bg-green-900/30"
              : "bg-red-50 dark:bg-red-900/30"
          )}>
            <span className="flex items-center gap-2">
              {projection.isOnTrack ? (
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <span className={cn(
                "font-medium",
                projection.isOnTrack
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300"
              )}>
                {t('budget.projection.projectedSavings', 'Projected savings')}
              </span>
            </span>
            <span className={cn(
              "text-xl font-bold",
              projection.isOnTrack
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}>
              {projection.projectedSavings >= 0 ? '+' : ''}{formatCurrency(projection.projectedSavings)}
            </span>
          </div>

          {/* Comparison with savings target */}
          {budget.savings_target && budget.savings_target > 0 && (
            <p className={cn(
              "text-sm text-center",
              projection.isOnTrack
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}>
              {projection.isOnTrack
                ? t('budget.projection.onTrack', 'On track to meet your savings goal!')
                : t('budget.projection.offTrack', 'At risk of missing savings goal by {{amount}}', {
                    amount: formatCurrency(Math.abs(projection.projectedSavings - budget.savings_target))
                  })
              }
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
