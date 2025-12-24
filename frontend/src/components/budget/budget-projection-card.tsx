import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import type { Budget, BudgetTracking } from '@/types'

interface BudgetProjectionCardProps {
  budget: Budget
  tracking: BudgetTracking
}

export function BudgetProjectionCard({ budget, tracking }: BudgetProjectionCardProps) {
  const { t } = useTranslation('common')

  const projection = useMemo(() => {
    // Parse month from budget (format: "YYYY-MM")
    const [year, month] = budget.month.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const daysElapsed = daysInMonth - tracking.days_remaining

    // Avoid division by zero
    if (daysElapsed <= 0) {
      return {
        daysInMonth,
        daysElapsed: 0,
        progressPercent: 0,
        dailyAvg: 0,
        projectedSpending: 0,
        projectedSavings: budget.monthly_income,
        isOnTrack: true,
      }
    }

    const dailyAvg = tracking.total_spent / daysElapsed
    const projectedSpending = dailyAvg * daysInMonth
    const projectedSavings = budget.monthly_income - projectedSpending
    const progressPercent = Math.round((daysElapsed / daysInMonth) * 100)

    return {
      daysInMonth,
      daysElapsed,
      progressPercent,
      dailyAvg: Math.round(dailyAvg),
      projectedSpending: Math.round(projectedSpending),
      projectedSavings: Math.round(projectedSavings),
      isOnTrack: projectedSavings >= (budget.savings_target || 0),
    }
  }, [budget, tracking])

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
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">
              {t('budget.projection.projectedSpending', 'Projected spending')}
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
