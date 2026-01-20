import { useTranslation } from 'react-i18next'
import { TrendingUp, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { useThresholdStatus } from '@/hooks/useBudgetAlerts'
import { cn } from '@/utils/cn'

interface BudgetWarningCardProps {
  budgetId: string
  budgetName: string
  spent: number
  limit: number
  className?: string
}

export function BudgetWarningCard({
  budgetId,
  budgetName,
  spent,
  limit,
  className
}: BudgetWarningCardProps) {
  const { t } = useTranslation('common')
  const percentage = Math.min((spent / limit) * 100, 100)
  const remaining = limit - spent
  const isOverBudget = spent > limit

  const { data: thresholdStatus } = useThresholdStatus(Number(budgetId))

  const getWarningLevel = () => {
    if (isOverBudget) {
      return {
        level: 'danger',
        icon: <TrendingUp className="w-5 h-5 text-red-500" />,
        message: t('alerts.over_budget.title'),
        colorClass: 'text-red-600 dark:text-red-400'
      }
    }
    if (percentage >= 80) {
      return {
        level: 'warning',
        icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
        message: t('alerts.near_limit.title'),
        colorClass: 'text-orange-600 dark:text-orange-400'
      }
    }
    if (percentage >= 50) {
      return {
        level: 'info',
        icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        message: t('alerts.halfway.title'),
        colorClass: 'text-yellow-600 dark:text-yellow-400'
      }
    }
    return null
  }

  const warning = getWarningLevel()

  if (!warning) return null

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start gap-3">
        {warning.icon}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className={cn('font-medium', warning.colorClass)}>
              {warning.message}
            </h4>
            <span className={cn('text-sm font-semibold', warning.colorClass)}>
              {percentage.toFixed(0)}%
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {t('alerts.budget_progress.message', {
              budget: budgetName,
              spent: `$${spent.toFixed(2)}`,
              limit: `$${limit.toFixed(2)}`
            })}
          </p>

          <Progress
            value={percentage}
            max={100}
            className="h-2"
          />

          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {t('alerts.remaining')}: ${remaining.toFixed(2)}
            </span>
            <span className={cn(
              'font-medium',
              isOverBudget
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300'
            )}>
              {isOverBudget
                ? t('alerts.over_by', { amount: `$${Math.abs(remaining).toFixed(2)}` })
                : t('alerts.left')}
            </span>
          </div>

          {thresholdStatus && 'next_threshold' in thresholdStatus && thresholdStatus.next_threshold && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{t('alerts.thresholds.next')}</span>
                <span>
                  {t('alerts.thresholds.at_threshold', {
                    percentage: thresholdStatus.next_threshold
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
