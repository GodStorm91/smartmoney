import { useState, lazy, Suspense, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Camera,
  Upload,
  PieChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { useGreeting } from '@/hooks/useGreeting'
import { useProfile } from '@/services/rewards-service'
const SpendingCalendar = lazy(() => import('@/components/dashboard/SpendingCalendar'))
import { DayTransactionsModal } from '@/components/dashboard/DayTransactionsModal'
import { NetWorthHero } from '@/components/dashboard/NetWorthHero'
import { NetWorthTrendChart } from '@/components/dashboard/NetWorthTrendChart'
import { CashFlowForecastCard } from '@/components/dashboard/CashFlowForecastCard'
import { SpendingVelocityCard } from '@/components/dashboard/SpendingVelocityCard'
import { InsightCards } from '@/components/dashboard/InsightCards'
import { QuickStatCard } from '@/components/dashboard/QuickStatCard'
import { SavingsRateCard } from '@/components/dashboard/SavingsRateCard'
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard'
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts'
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard'
import { DashboardGoalsSection } from '@/components/dashboard/DashboardGoalsSection'
import { SubscriptionsWidget } from '@/components/dashboard/SubscriptionsWidget'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { ProxyReceivablesWidget } from '@/components/proxy/ProxyReceivablesWidget'
import { ReportBanner } from '@/components/dashboard/ReportBanner'
import { formatMonth } from '@/utils/formatDate'
import { fetchHealthScore } from '@/services/health-score-service'
import { fetchDashboardSummary, fetchMonthlyTrends } from '@/services/analytics-service'
import { fetchGoals, fetchGoalProgress } from '@/services/goal-service'
import { fetchTransactions } from '@/services/transaction-service'
import { fetchRecurringTransactions } from '@/services/recurring-service'
import { getUnreadAnomalyCount } from '@/services/anomaly-service'
import { fetchBudgetAlerts, markBudgetAlertRead } from '@/services/budget-service'
import { getLiveInsights } from '@/services/insight-service'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { useTierLimits } from '@/hooks/useTierLimits'
import type { Transaction } from '@/types'

export function Dashboard() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const limits = useTierLimits()
  const { data: profile } = useProfile()
  const { greeting, subtitle: greetingSubtitle, emoji } = useGreeting(profile?.display_name)

  const [currentDate, setCurrentDate] = useState(new Date())

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => fetchDashboardSummary(),
  })

  const { data: monthlyTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['monthly-trends', 12],
    queryFn: () => fetchMonthlyTrends(12),
  })

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  const { data: goalsProgress } = useQuery({
    queryKey: ['goals-progress', goals?.map(g => g.id)],
    queryFn: async () => {
      if (!goals || goals.length === 0) return []
      return Promise.all(goals.map(goal => fetchGoalProgress(goal.id, true)))
    },
    enabled: !!goals && goals.length > 0,
  })

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const transactions = await fetchTransactions()
      return transactions.slice(0, limits.recentTransactions)
    },
  })

  const { data: accounts } = useAccounts()

  const { data: unreadAnomalies } = useQuery({
    queryKey: ['unreadAnomalyCount'],
    queryFn: getUnreadAnomalyCount,
  })

  const { data: recurringTxns } = useQuery({
    queryKey: ['recurring-transactions', true],
    queryFn: () => fetchRecurringTransactions(true),
    staleTime: 5 * 60 * 1000,
  })

  const queryClient = useQueryClient()

  const { data: budgetAlerts } = useQuery({
    queryKey: ['budget-alerts'],
    queryFn: () => fetchBudgetAlerts(true),
  })

  const markAlertReadMutation = useMutation({
    mutationFn: markBudgetAlertRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget-alerts'] }),
  })

  const { data: liveInsights } = useQuery({
    queryKey: ['live-insights'],
    queryFn: () => getLiveInsights(10),
    staleTime: 30 * 60 * 1000,
  })

  const { data: healthScore } = useQuery({
    queryKey: ['health-score'],
    queryFn: fetchHealthScore,
    staleTime: 60 * 60 * 1000,
  })

  const [selectedDayTransactions, setSelectedDayTransactions] = useState<Transaction[] | null>(null)
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null)

  const handleDayClick = (date: Date, transactions: Transaction[]) => {
    if (transactions.length > 0) {
      setSelectedDayDate(date.toISOString())
      setSelectedDayTransactions(transactions)
    }
  }

  const closeDayModal = () => {
    setSelectedDayTransactions(null)
    setSelectedDayDate(null)
  }

  const isLoading = summaryLoading || trendsLoading || goalsLoading

  // useCallback hooks must be declared before any early returns (Rules of Hooks)
  const formatCurrency = useCallback((amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode),
    [currency, exchangeRates?.rates, isPrivacyMode])

  const formatTransactionCurrency = useCallback((amount: number, txCurrency: string = 'JPY') =>
    formatCurrencyPrivacy(amount, txCurrency, exchangeRates?.rates || {}, true, isPrivacyMode),
    [exchangeRates?.rates, isPrivacyMode])

  const currentMonth = monthlyTrends?.[monthlyTrends.length - 1]
  const savingsRate = currentMonth && currentMonth.income > 0
    ? ((currentMonth.income - currentMonth.expenses) / currentMonth.income) * 100
    : 0

  // Quick actions (capped at 4)
  const quickActions = [
    { icon: Plus, label: t('quickActions.add', 'Add'), color: 'bg-primary-500', to: '/transactions?action=add-transaction' },
    { icon: Camera, label: t('quickActions.scan', 'Scan'), color: 'bg-purple-500', to: '/transactions?action=scan-receipt' },
    { icon: Upload, label: t('quickActions.upload', 'Upload'), color: 'bg-blue-500', to: '/upload' },
    { icon: PieChart, label: t('quickActions.analytics', 'Analytics'), color: 'bg-green-500', to: '/analytics' },
  ]

  // Smart alerts
  const alerts: Array<{ type: string; message: string }> = []
  if (currentMonth && currentMonth.expenses > currentMonth.income && currentMonth.income > 0) {
    alerts.push({ type: 'danger', message: t('alerts.overspending', 'Overspending') })
  }
  if (savingsRate < 10 && savingsRate >= 0) {
    alerts.push({ type: 'warning', message: t('alerts.lowSavings', 'Low savings') })
  }

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="min-h-screen pb-32">
      {/* Sticky Header — confident, content-driven */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-2xl mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d) }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={t('dashboard.prevMonth', 'Previous month')}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.12em]">
              {formatMonth(currentDate)}
            </h1>
            <button
              onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d) }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={t('dashboard.nextMonth', 'Next month')}
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <div>
            <h2 className="text-[1.875rem] sm:text-[2.25rem] font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              {emoji} {greeting}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              {greetingSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* 1. Onboarding (auto-hides after completion) */}
        <OnboardingChecklist />

        {/* 2. Quick Actions — primary interaction point */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-3 pb-2 min-w-max">
            {quickActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <Link
                  key={idx}
                  to={action.to}
                  className="flex flex-col items-center gap-2 p-1 animate-stagger-in"
                  style={{ '--stagger-index': idx } as React.CSSProperties}
                >
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center shadow-md',
                    'transition-all duration-150 ease-out hover:scale-[1.08] hover:shadow-lg active:scale-95 active:duration-[50ms]',
                    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    action.color
                  )}>
                    <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                    {action.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* 3. Net Worth Hero — THE focal point */}
        <div className="pt-1">
          <NetWorthHero summary={summary} accounts={accounts || []} />
        </div>

        {/* 4. Alerts (merged smart + anomaly + budget) */}
        <DashboardAlerts
          alerts={alerts}
          unreadAnomalyCount={unreadAnomalies?.count}
          budgetAlerts={budgetAlerts?.alerts || []}
          onDismissBudgetAlert={(id) => markAlertReadMutation.mutate(id)}
        />

        {/* 4.5 Report Banner (first 7 days of month) */}
        <ReportBanner />

        {/* 5. Proxy Receivables (self-handles empty state) */}
        <ProxyReceivablesWidget />

        {/* 6. Monthly Summary — income/expenses + savings rate */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="animate-stagger-in" style={{ '--stagger-index': 0 } as React.CSSProperties}>
              <QuickStatCard
                label={t('dashboard.income', 'Income')}
                value={currentMonth?.income || 0}
                change={5.2}
                isPositive
                formatCurrency={formatCurrency}
                className="bg-income-50/50 dark:bg-income-900/10 border-income-100 dark:border-income-900/20"
              />
            </div>
            <div className="animate-stagger-in" style={{ '--stagger-index': 1 } as React.CSSProperties}>
              <QuickStatCard
                label={t('dashboard.expenses', 'Expenses')}
                value={currentMonth?.expenses || 0}
                change={-2.1}
                isPositive={false}
                formatCurrency={formatCurrency}
                className="bg-expense-50/50 dark:bg-expense-900/10 border-expense-100 dark:border-expense-900/20"
              />
            </div>
          </div>

          <SavingsRateCard rate={savingsRate} />
        </div>

        {/* 7. Net Worth Trend */}
        <NetWorthTrendChart data={monthlyTrends} />

        {/* 8. Cashflow Forecast */}
        <CashFlowForecastCard />

        {/* 9. Spending Velocity */}
        <SpendingVelocityCard />

        {/* 10. AI Insights */}
        {liveInsights && liveInsights.insights.length > 0 && (
          <InsightCards insights={liveInsights.insights} />
        )}

        {/* 11. Financial Health Score */}
        {healthScore && <HealthScoreCard data={healthScore} />}

        {/* 12. Recent Transactions */}
        <RecentTransactionsCard
          transactions={recentTransactions}
          formatCurrency={formatTransactionCurrency}
        />

        {/* 13. Spending Calendar (lazy-loaded) */}
        <Suspense fallback={<div className="h-64 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
          <SpendingCalendar onDayClick={handleDayClick} />
        </Suspense>

        {/* 14. Goals Progress */}
        <DashboardGoalsSection
          goalsProgress={goalsProgress}
          goalsCount={goals?.length ?? 0}
          formatCurrency={formatTransactionCurrency}
        />

        {/* 15. Subscriptions Widget */}
        <SubscriptionsWidget
          recurringTxns={recurringTxns}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Day Detail Modal */}
      {selectedDayTransactions && selectedDayDate && (
        <DayTransactionsModal
          isOpen={!!selectedDayTransactions}
          onClose={closeDayModal}
          date={new Date(selectedDayDate)}
          transactions={selectedDayTransactions}
        />
      )}
    </div>
  )
}
