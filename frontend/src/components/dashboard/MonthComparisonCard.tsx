import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'

interface MonthData {
  month: string
  income: number
  expenses: number
  net: number
}

interface MonthComparisonCardProps {
  currentMonth: MonthData
  previousMonth?: MonthData
}

interface ComparisonMetric {
  label: string
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
  isNeutral: boolean
}

export function MonthComparisonCard({ currentMonth, previousMonth }: MonthComparisonCardProps) {
  const { t } = useTranslation('common')

  const metrics = useMemo<ComparisonMetric[]>(() => {
    if (!previousMonth) return []

    const calcChange = (current: number, previous: number, invertPositive = false) => {
      const change = current - previous
      const changePercent = previous > 0 ? (change / previous) * 100 : 0
      const isNeutral = Math.abs(changePercent) < 1
      // For expenses, decrease is positive; for income/net, increase is positive
      const isPositive = invertPositive ? change < 0 : change > 0
      return { change, changePercent, isPositive, isNeutral }
    }

    const incomeChange = calcChange(currentMonth.income, previousMonth.income)
    const expenseChange = calcChange(currentMonth.expenses, previousMonth.expenses, true)
    const netChange = calcChange(currentMonth.net, previousMonth.net)

    return [
      {
        label: t('comparison.income', 'Income'),
        current: currentMonth.income,
        previous: previousMonth.income,
        ...incomeChange,
      },
      {
        label: t('comparison.expenses', 'Expenses'),
        current: currentMonth.expenses,
        previous: previousMonth.expenses,
        ...expenseChange,
      },
      {
        label: t('comparison.savings', 'Savings'),
        current: currentMonth.net,
        previous: previousMonth.net,
        ...netChange,
      },
    ]
  }, [currentMonth, previousMonth, t])

  if (!previousMonth) {
    return null
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-gray-400" />
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('comparison.title', 'Month vs Month')}
        </h3>
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {metric.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(metric.current)}
                  </span>
                  {!metric.isNeutral && (
                    <span
                      className={cn(
                        'flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full',
                        metric.isPositive
                          ? 'bg-income-100 text-income-600 dark:bg-income-900/30 dark:text-income-300'
                          : 'bg-expense-100 text-expense-600 dark:bg-expense-900/30 dark:text-expense-300'
                      )}
                    >
                      {metric.isPositive ? (
                        <TrendingUp size={10} />
                      ) : (
                        <TrendingDown size={10} />
                      )}
                      {metric.changePercent > 0 ? '+' : ''}
                      {Math.round(metric.changePercent)}%
                    </span>
                  )}
                  {metric.isNeutral && (
                    <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <Minus size={10} />
                      0%
                    </span>
                  )}
                </div>
              </div>

              {/* Comparison bar */}
              <div className="flex items-center gap-2 h-2">
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (metric.previous / Math.max(metric.current, metric.previous)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      metric.isPositive ? 'bg-income-600' : metric.isNeutral ? 'bg-gray-400' : 'bg-expense-600'
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(0, (metric.current / Math.max(metric.current, metric.previous)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{t('comparison.lastMonth', 'Last month')}</span>
                <span>{t('comparison.thisMonth', 'This month')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
