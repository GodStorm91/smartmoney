import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, TrendingUp, Target, Wallet, Bell } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'

interface Alert {
  id: string
  type: 'warning' | 'danger' | 'info'
  icon: React.ReactNode
  title: string
  description: string
  action?: string
}

interface SmartAlertsCardProps {
  income: number
  expense: number
  savingsRate: number
  budgetCategories?: Array<{ category: string; allocated: number; spent: number }>
  goals?: Array<{ name: string; target: number; current: number; deadline?: string }>
  onDismiss?: (alertId: string) => void
}

export function SmartAlertsCard({
  income,
  expense,
  savingsRate,
  budgetCategories = [],
  goals = [],
}: SmartAlertsCardProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const rates = exchangeRates?.rates || {}

  const alerts = useMemo(() => {
    const fmt = (amount: number) => formatCurrency(amount, currency, rates, false)
    const result: Alert[] = []

    // 1. Overspending alert
    if (expense > income && income > 0) {
      result.push({
        id: 'overspending',
        type: 'danger',
        icon: <AlertTriangle size={16} />,
        title: t('alerts.overspending', 'Overspending Alert'),
        description: t('alerts.overspendingDesc', 'Expenses exceed income by {{amount}}', {
          amount: fmt(expense - income),
        }),
      })
    }

    // 2. Low savings rate
    if (savingsRate < 10 && savingsRate >= 0 && income > 0) {
      result.push({
        id: 'low-savings',
        type: 'warning',
        icon: <Wallet size={16} />,
        title: t('alerts.lowSavings', 'Low Savings Rate'),
        description: t('alerts.lowSavingsDesc', 'Only saving {{rate}}% of income', {
          rate: Math.round(savingsRate),
        }),
      })
    }

    // 3. Budget categories over limit
    const overBudget = budgetCategories.filter(cat => cat.spent > cat.allocated && cat.allocated > 0)
    if (overBudget.length > 0) {
      const worstCategory = overBudget.reduce((prev, curr) =>
        (curr.spent - curr.allocated) > (prev.spent - prev.allocated) ? curr : prev
      )
      result.push({
        id: 'budget-exceeded',
        type: 'warning',
        icon: <TrendingUp size={16} />,
        title: t('alerts.budgetExceeded', 'Budget Exceeded'),
        description: t('alerts.budgetExceededDesc', '{{category}} is {{amount}} over budget', {
          category: t(`category.${worstCategory.category}`, worstCategory.category),
          amount: fmt(worstCategory.spent - worstCategory.allocated),
        }),
      })
    }

    // 4. Goal deadline approaching
    const now = new Date()
    goals.forEach(goal => {
      if (goal.deadline) {
        const deadline = new Date(goal.deadline)
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0

        if (daysLeft <= 30 && daysLeft > 0 && progress < 80) {
          result.push({
            id: `goal-${goal.name}`,
            type: 'info',
            icon: <Target size={16} />,
            title: t('alerts.goalDeadline', 'Goal Deadline'),
            description: t('alerts.goalDeadlineDesc', '{{name}}: {{days}} days left, {{progress}}% complete', {
              name: goal.name,
              days: daysLeft,
              progress: Math.round(progress),
            }),
          })
        }
      }
    })

    return result.slice(0, 3) // Max 3 alerts
  }, [income, expense, savingsRate, budgetCategories, goals, t, currency, rates])

  if (alerts.length === 0) {
    return null
  }

  return (
    <Card className="overflow-hidden border-l-4 border-l-amber-500">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={16} className="text-amber-500" />
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('alerts.title', 'Smart Alerts')}
        </h3>
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg',
              alert.type === 'danger' && 'bg-expense-50 dark:bg-expense-900/20',
              alert.type === 'warning' && 'bg-amber-50 dark:bg-amber-900/20',
              alert.type === 'info' && 'bg-primary-50 dark:bg-primary-900/20'
            )}
          >
            <div
              className={cn(
                'p-1.5 rounded-full flex-shrink-0',
                alert.type === 'danger' && 'bg-expense-100 text-expense-600 dark:bg-expense-900 dark:text-expense-300',
                alert.type === 'warning' && 'bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-400',
                alert.type === 'info' && 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300'
              )}
            >
              {alert.icon}
            </div>

            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'font-medium text-sm',
                  alert.type === 'danger' && 'text-expense-600 dark:text-expense-300',
                  alert.type === 'warning' && 'text-amber-800 dark:text-amber-300',
                  alert.type === 'info' && 'text-primary-600 dark:text-primary-300'
                )}
              >
                {alert.title}
              </span>
              <p
                className={cn(
                  'text-xs mt-0.5',
                  alert.type === 'danger' && 'text-expense-600 dark:text-expense-300',
                  alert.type === 'warning' && 'text-amber-600 dark:text-amber-400',
                  alert.type === 'info' && 'text-primary-600 dark:text-primary-300'
                )}
              >
                {alert.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
