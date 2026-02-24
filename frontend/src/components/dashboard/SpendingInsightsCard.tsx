import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, AlertTriangle, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'

interface CategoryData {
  category: string
  amount: number
  percentage: number
  previous_amount?: number | null
}

interface SpendingInsightsCardProps {
  categories: CategoryData[]
  income: number
  expense: number
  previousIncome?: number
  previousExpense?: number
}

interface Insight {
  type: 'warning' | 'positive' | 'neutral'
  icon: React.ReactNode
  title: string
  description: string
  value?: string
}

export function SpendingInsightsCard({
  categories,
  income,
  expense,
  previousIncome,
  previousExpense,
}: SpendingInsightsCardProps) {
  const { t } = useTranslation('common')
  const [isDismissed, setIsDismissed] = useState(false)

  // Check if user previously dismissed the insights
  useEffect(() => {
    const dismissed = localStorage.getItem('spendingInsightsDismissed')
    if (dismissed) {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('spendingInsightsDismissed', 'true')
  }

  const handleShowAgain = () => {
    setIsDismissed(false)
    localStorage.removeItem('spendingInsightsDismissed')
  }

  // Don't render if dismissed
  if (isDismissed) {
    return (
      <div className="relative">
        <button
          onClick={handleShowAgain}
          className="w-full text-left text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-2"
        >
          <AlertTriangle size={14} />
          {t('insights.showAgain', 'Show spending insights')}
        </button>
      </div>
    )
  }

  const insights = useMemo(() => {
    const result: Insight[] = []

    // 1. Spending vs Income ratio
    const spendingRatio = income > 0 ? (expense / income) * 100 : 0
    if (spendingRatio > 90) {
      result.push({
        type: 'warning',
        icon: <AlertTriangle size={16} />,
        title: t('insights.highSpending', 'High Spending Alert'),
        description: t('insights.highSpendingDesc', 'You\'re spending {{ratio}}% of your income', { ratio: Math.round(spendingRatio) }),
        value: `${Math.round(spendingRatio)}%`,
      })
    } else if (spendingRatio < 50) {
      result.push({
        type: 'positive',
        icon: <TrendingDown size={16} />,
        title: t('insights.goodSavings', 'Great Savings!'),
        description: t('insights.goodSavingsDesc', 'You\'re saving {{ratio}}% of your income', { ratio: Math.round(100 - spendingRatio) }),
        value: `${Math.round(100 - spendingRatio)}%`,
      })
    }

    // 2. Month-over-month spending change
    if (previousExpense && previousExpense > 0) {
      const expenseChange = ((expense - previousExpense) / previousExpense) * 100
      if (expenseChange > 20) {
        result.push({
          type: 'warning',
          icon: <TrendingUp size={16} />,
          title: t('insights.spendingUp', 'Spending Increased'),
          description: t('insights.spendingUpDesc', 'Up {{change}}% from last month', { change: Math.round(expenseChange) }),
          value: `+${Math.round(expenseChange)}%`,
        })
      } else if (expenseChange < -10) {
        result.push({
          type: 'positive',
          icon: <TrendingDown size={16} />,
          title: t('insights.spendingDown', 'Spending Decreased'),
          description: t('insights.spendingDownDesc', 'Down {{change}}% from last month', { change: Math.abs(Math.round(expenseChange)) }),
          value: `${Math.round(expenseChange)}%`,
        })
      }
    }

    // 3. Top spending category insight
    if (categories.length > 0) {
      const topCategory = categories[0]
      if (topCategory.percentage > 40) {
        result.push({
          type: 'neutral',
          icon: <AlertTriangle size={16} />,
          title: t('insights.topCategory', 'Top Category: {{category}}', { category: t(`category.${topCategory.category}`, topCategory.category) }),
          description: t('insights.topCategoryDesc', '{{percentage}}% of your spending', { percentage: Math.round(topCategory.percentage) }),
          value: formatCurrency(topCategory.amount),
        })
      }
    }

    // 4. Unusual spending detection
    categories.forEach(cat => {
      if (cat.previous_amount && cat.previous_amount > 0) {
        const change = ((cat.amount - cat.previous_amount) / cat.previous_amount) * 100
        if (change > 50 && cat.amount > expense * 0.1) { // Increased 50%+ and >10% of total
          result.push({
            type: 'warning',
            icon: <AlertTriangle size={16} />,
            title: t('insights.unusualSpending', 'Unusual: {{category}}', { category: t(`category.${cat.category}`, cat.category) }),
            description: t('insights.unusualSpendingDesc', 'Up {{change}}% vs last month', { change: Math.round(change) }),
            value: formatCurrency(cat.amount),
          })
        }
      }
    })

    return result.slice(0, 3) // Max 3 insights
  }, [categories, income, expense, previousIncome, previousExpense, t])

  if (insights.length === 0) {
    return null
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('insights.title', 'Spending Insights')}
        </h3>
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={t('button.dismiss', 'Dismiss')}
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg transition-colors',
              insight.type === 'warning' && 'bg-amber-50 dark:bg-amber-900/20',
              insight.type === 'positive' && 'bg-income-50 dark:bg-income-900/20',
              insight.type === 'neutral' && 'bg-gray-50 dark:bg-gray-800/50'
            )}
          >
            <div
              className={cn(
                'p-1.5 rounded-full flex-shrink-0',
                insight.type === 'warning' && 'bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-400',
                insight.type === 'positive' && 'bg-income-100 text-income-600 dark:bg-income-900/30 dark:text-income-300',
                insight.type === 'neutral' && 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              )}
            >
              {insight.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                  {insight.title}
                </span>
                {insight.value && (
                  <span
                    className={cn(
                      'text-sm font-semibold flex-shrink-0',
                      insight.type === 'warning' && 'text-amber-600 dark:text-amber-400',
                      insight.type === 'positive' && 'text-income-600 dark:text-income-300',
                      insight.type === 'neutral' && 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {insight.value}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
