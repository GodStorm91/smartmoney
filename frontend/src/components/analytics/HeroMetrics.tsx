import { useTranslation } from 'react-i18next'
import { MetricCard } from './MetricCard'
import { formatCurrency } from '@/utils/formatCurrency'
import type { Analytics } from '@/types/analytics'

interface HeroMetricsProps {
  analytics: Analytics
  displayCurrency?: string
}

export function HeroMetrics({ analytics, displayCurrency = 'JPY' }: HeroMetricsProps) {
  const { t } = useTranslation('common')

  const {
    total_income,
    total_expense,
    net_cashflow,
    comparison,
    top_category,
  } = analytics

  // Determine trend direction based on change value
  const getIncomeTrend = () => {
    if (!comparison?.income_change) return 'neutral'
    return comparison.income_change > 0 ? 'positive' : 'negative'
  }

  const getExpenseTrend = () => {
    if (!comparison?.expense_change) return 'neutral'
    // For expenses, decrease is positive (good)
    return comparison.expense_change < 0 ? 'positive' : 'negative'
  }

  const getNetTrend = () => {
    if (!comparison?.net_change) return 'neutral'
    return comparison.net_change > 0 ? 'positive' : 'negative'
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Net Cashflow — hero card with gradient */}
      <MetricCard
        label={t('analytics.heroNet')}
        value={formatCurrency(net_cashflow, displayCurrency)}
        change={comparison?.net_change}
        trend={getNetTrend()}
        hero
        className="col-span-2 bg-hero-gradient"
      />
      {/* Income — green tint */}
      <MetricCard
        label={t('analytics.heroIncome')}
        value={formatCurrency(total_income, displayCurrency)}
        change={comparison?.income_change}
        trend={getIncomeTrend()}
        className="bg-income-50/50 dark:bg-income-900/10 border-income-100 dark:border-income-900/20"
      />
      {/* Expense — rose tint */}
      <MetricCard
        label={t('analytics.heroExpense')}
        value={formatCurrency(total_expense, displayCurrency)}
        change={comparison?.expense_change}
        trend={getExpenseTrend()}
        className="bg-expense-50/50 dark:bg-expense-900/10 border-expense-100 dark:border-expense-900/20"
      />
      {/* Top Category */}
      <MetricCard
        label={t('analytics.heroTopCategory')}
        value={top_category?.name || '-'}
        subtitle={
          top_category
            ? `${formatCurrency(top_category.amount, displayCurrency)} (${top_category.percentage}%)`
            : undefined
        }
        className="col-span-2"
      />
    </div>
  )
}
