import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { TrendingUp, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { BudgetPulseHero } from '../budget-pulse-hero'
import { BudgetMoneyFlow } from '../budget-money-flow'
import { BudgetDonutChart } from '../budget-donut-chart'
import { SpendingAlert } from '../spending-alert'
import { UncategorizedSpendingAlert } from '../uncategorized-spending-alert'
import type { AiCategorizationState } from '../uncategorized-spending-alert'
import { AiCategorizeReviewModal } from '../ai-categorize-review-modal'
import { BudgetCoverageIndicator } from '../budget-coverage-indicator'
import { calculateBudgetForecast } from '@/utils/spending-prediction'
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
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  const totalAllocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0)
  const totalBudget = budget.monthly_income - (budget.savings_target || 0)
  const spentSoFar = tracking?.total_spent || 0

  // AI categorization state
  const [aiState, setAiState] = useState<AiCategorizationState>('idle')
  const [showReviewModal, setShowReviewModal] = useState(false)

  const budgetCategoryNames = useMemo(
    () => budget.allocations.map((a) => a.category),
    [budget.allocations]
  )

  const handleAiCategorize = useCallback(() => {
    setShowReviewModal(true)
  }, [])

  const handleCategorizationSuccess = useCallback(() => {
    setAiState('success')
    queryClient.invalidateQueries({ queryKey: ['budget', 'tracking'] })
    queryClient.invalidateQueries({ queryKey: ['budget', 'month'] })
  }, [queryClient])

  const forecast = useMemo(() => {
    if (!tracking) return null
    return calculateBudgetForecast(tracking)
  }, [tracking])

  const navigateToForecast = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', 'forecast')
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="space-y-4">
      {/* 1. Budget Pulse Hero */}
      <BudgetPulseHero
        totalBudget={totalBudget}
        totalSpent={spentSoFar}
        totalAllocated={totalAllocated}
        month={selectedMonth}
      />

      {/* 2. Forecast Alert — compact forward-looking insight */}
      {forecast && (
        <button
          onClick={navigateToForecast}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
            forecast.overallStatus === 'danger'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
              : forecast.overallStatus === 'warning'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
          )}
        >
          {forecast.overallStatus === 'danger' ? (
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          ) : forecast.overallStatus === 'warning' ? (
            <TrendingUp className="w-5 h-5 text-amber-500 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
          <p className={cn(
            'flex-1 text-sm font-medium',
            forecast.overallStatus === 'danger' ? 'text-red-700 dark:text-red-300' :
            forecast.overallStatus === 'warning' ? 'text-amber-700 dark:text-amber-300' :
            'text-green-700 dark:text-green-300'
          )}>
            {forecast.overallStatus === 'danger'
              ? t('budget.forecastAlert.exceedBy', { amount: formatCurrency(forecast.totalPredicted - forecast.totalBudget) })
              : forecast.overallStatus === 'warning'
              ? t('budget.forecastAlert.nearLimit', { percent: Math.round(forecast.overallPercent) })
              : t('budget.forecastAlert.onTrackSave', { amount: formatCurrency(forecast.totalBudget - forecast.totalPredicted) })}
          </p>
          <span className={cn(
            'text-xs font-medium flex items-center gap-0.5 flex-shrink-0',
            forecast.overallStatus === 'danger' ? 'text-red-500 dark:text-red-400' :
            forecast.overallStatus === 'warning' ? 'text-amber-500 dark:text-amber-400' :
            'text-green-500 dark:text-green-400'
          )}>
            {t('budget.forecastAlert.seeDetails')}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      {/* 2b. Uncategorized Spending Warning */}
      {tracking?.uncategorized_spending != null && tracking.uncategorized_spending > 0 && (
        <UncategorizedSpendingAlert
          amount={tracking.uncategorized_spending}
          transactions={tracking.uncategorized_transactions}
          month={selectedMonth}
          aiState={aiState}
          onAiCategorize={handleAiCategorize}
        />
      )}

      {/* AI Categorize Review Modal */}
      <AiCategorizeReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        month={selectedMonth}
        budgetCategories={budgetCategoryNames}
        onSuccess={handleCategorizationSuccess}
      />

      {/* 2c. Budget Coverage Indicator */}
      {tracking && <BudgetCoverageIndicator tracking={tracking} />}

      {/* 3. Actionable Spending Alerts */}
      {tracking && tracking.categories && tracking.categories.length > 0 && (
        <SpendingAlert
          categories={tracking.categories}
          daysRemaining={tracking.days_remaining}
          onViewCategory={onViewCategory}
        />
      )}

      {/* 4. Money Flow: Income → Allocated → Savings */}
      <BudgetMoneyFlow
        income={budget.monthly_income}
        allocated={totalAllocated}
        savings={budget.savings_target || 0}
        formatCurrency={formatCurrency}
      />

      {/* 5. Compact Donut Chart */}
      {budget.allocations.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('budget.donutChart.title')}
          </h3>
          <BudgetDonutChart
            allocations={budget.allocations}
            totalBudget={totalBudget}
            totalAllocated={totalAllocated}
            compact
          />
        </Card>
      )}
    </div>
  )
}
