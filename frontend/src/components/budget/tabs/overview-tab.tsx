import { useTranslation } from 'react-i18next'
import { TrendingUp, AlertTriangle, Wallet, PiggyBank, Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { BudgetProjectionCard } from '../budget-projection-card'
import { BudgetDonutChart } from '../budget-donut-chart'
import { SpendingAlert } from '../spending-alert'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { Budget, BudgetTracking } from '@/types'

interface OverviewTabProps {
  budget: Budget
  tracking?: BudgetTracking
  previousMonthData?: Budget | null
  selectedMonth: string
  onViewCategory: (category: string) => void
}

export function OverviewTab({
  budget,
  tracking,
  previousMonthData,
  selectedMonth,
  onViewCategory
}: OverviewTabProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  const totalAllocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0)
  const totalBudget = budget.monthly_income - (budget.savings_target || 0)
  const remainingBudget = totalBudget - totalAllocated

  const spentSoFar = tracking?.total_spent || 0
  const spentPercent = totalAllocated > 0 ? (spentSoFar / totalAllocated) * 100 : 0

  // Calculate health status
  const getHealthStatus = () => {
    if (spentSoFar > totalAllocated) {
      return {
        status: 'danger',
        label: t('budget.health.overBudgetStatus'),
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30'
      }
    }
    if (spentPercent > 95) {
      return {
        status: 'warning',
        label: t('budget.health.almostFull'),
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30'
      }
    }
    if (spentPercent > 85) {
      return {
        status: 'caution',
        label: t('budget.health.warningNearLimit'),
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30'
      }
    }
    return {
      status: 'good',
      label: t('budget.health.onTrack'),
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30'
    }
  }

  const health = getHealthStatus()

  return (
    <div className="space-y-4">
      {/* Budget Health Status Banner */}
      <div className={cn('p-4 rounded-xl border', health.bg, health.color, 'border-current/20')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              health.status === 'danger' ? 'bg-red-500' :
              health.status === 'warning' ? 'bg-amber-500' :
              health.status === 'caution' ? 'bg-yellow-500' : 'bg-green-500'
            )}>
              {health.status === 'danger' ? (
                <AlertTriangle className="w-5 h-5 text-white" />
              ) : (
                <TrendingUp className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-semibold">{health.label}</p>
              <p className="text-sm opacity-80">
                {t('budget.usedOfTotal', {
                  used: formatCurrency(spentSoFar),
                  total: formatCurrency(totalAllocated)
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{Math.round(spentPercent)}%</p>
            <p className="text-xs opacity-70">{t('budget.budgetUsed')}</p>
          </div>
        </div>
      </div>

      {/* Spending Forecast Card */}
      <BudgetProjectionCard
        totalBudget={totalBudget}
        totalSpent={spentSoFar}
        month={selectedMonth}
      />

      {/* Budget Composition Donut Chart */}
      {budget.allocations.length > 0 && (
        <BudgetDonutChart
          allocations={budget.allocations}
          totalBudget={totalBudget}
          totalAllocated={totalAllocated}
        />
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Income Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('budget.monthlyIncome')}
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(budget.monthly_income)}
          </p>
          {previousMonthData && (budget.monthly_income - previousMonthData.monthly_income) !== 0 && (
            <p className={cn(
              'text-xs mt-1',
              budget.monthly_income > previousMonthData.monthly_income
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}>
              {budget.monthly_income > previousMonthData.monthly_income ? '+' : ''}
              {formatCurrency(budget.monthly_income - previousMonthData.monthly_income)}
            </p>
          )}
        </Card>

        {/* Savings Target Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <PiggyBank className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('budget.savingsTarget')}
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(budget.savings_target || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('budget.percentOfIncome', {
              percent: Math.round(((budget.savings_target || 0) / budget.monthly_income) * 100)
            })}
          </p>
        </Card>

        {/* Remaining Budget Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('budget.remaining')}
            </span>
          </div>
          <p className={cn(
            'text-xl font-bold',
            remainingBudget >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
          )}>
            {formatCurrency(Math.abs(remainingBudget))}
            {remainingBudget < 0 && '!'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {remainingBudget >= 0 ? t('budget.availableToSpend') : t('budget.overAllocated')}
          </p>
        </Card>
      </div>

      {/* Spending Progress */}
      {tracking && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('budget.spendingProgress')}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatCurrency(spentSoFar)} / {formatCurrency(totalAllocated)}
            </span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                spentSoFar > totalAllocated ? 'bg-red-500' :
                spentSoFar > totalAllocated * 0.9 ? 'bg-amber-500' :
                spentSoFar > totalAllocated * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(100, (spentSoFar / totalAllocated) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{Math.round((spentSoFar / totalAllocated) * 100)}%</span>
            <span>{tracking.days_remaining} {t('budget.daysLeft')}</span>
          </div>
        </Card>
      )}

      {/* Smart Spending Alerts */}
      {tracking && tracking.categories && tracking.categories.length > 0 && (
        <SpendingAlert
          categories={tracking.categories}
          daysRemaining={tracking.days_remaining}
          onViewCategory={onViewCategory}
        />
      )}
    </div>
  )
}
