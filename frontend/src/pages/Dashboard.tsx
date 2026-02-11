import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Target,
  Plus,
  Camera,
  Upload,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Receipt
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { SpendingCalendar } from '@/components/dashboard/SpendingCalendar'
import { DayTransactionsModal } from '@/components/dashboard/DayTransactionsModal'
import { NetWorthHero } from '@/components/dashboard/NetWorthHero'
import { QuickStatCard } from '@/components/dashboard/QuickStatCard'
import { SavingsRateCard } from '@/components/dashboard/SavingsRateCard'
import { MiniGoalCard } from '@/components/dashboard/MiniGoalCard'
import { KpiRow } from '@/components/dashboard/KpiRow'
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { ProxyReceivablesWidget } from '@/components/proxy/ProxyReceivablesWidget'
import { ReportBanner } from '@/components/dashboard/ReportBanner'
import { formatMonth, formatDate } from '@/utils/formatDate'
import { fetchDashboardSummary, fetchMonthlyTrends } from '@/services/analytics-service'
import { fetchGoals, fetchGoalProgress } from '@/services/goal-service'
import { fetchTransactions } from '@/services/transaction-service'
import { getUnreadAnomalyCount } from '@/services/anomaly-service'
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

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  const formatTransactionCurrency = (amount: number, txCurrency: string = 'JPY') =>
    formatCurrencyPrivacy(amount, txCurrency, exchangeRates?.rates || {}, true, isPrivacyMode)

  return (
    <div className="min-h-screen pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d) }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatMonth(currentDate)}
            </h1>
            <button
              onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d) }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t('dashboard.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.subtitle', { month: formatMonth(new Date()) })}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* 1. Onboarding (auto-hides after completion) */}
        <OnboardingChecklist />

        {/* 2. Proxy Receivables (self-handles empty state) */}
        <ProxyReceivablesWidget />

        {/* 3. Net Worth Hero */}
        <NetWorthHero summary={summary} />

        {/* 4. Alerts (merged smart + anomaly) */}
        <DashboardAlerts alerts={alerts} unreadAnomalyCount={unreadAnomalies?.count} />

        {/* 4.5 Report Banner (first 7 days of month) */}
        <ReportBanner />

        {/* 5. Quick Actions */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-3 pb-2 min-w-max">
            {quickActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <Link
                  key={idx}
                  to={action.to}
                  className="flex flex-col items-center gap-1.5 p-1 animate-stagger-in"
                  style={{ '--stagger-index': idx } as React.CSSProperties}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    'transition-all duration-150 ease-out hover:scale-[1.08] hover:shadow-lg active:scale-95 active:duration-[50ms]',
                    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    action.color
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {action.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* 6. Monthly Summary (KPI + Income/Expense + Savings Rate) */}
        <KpiRow summary={summary} formatCurrency={formatCurrency} accounts={accounts || []} exchangeRates={exchangeRates?.rates || {}} />

        <div className="grid grid-cols-2 gap-3">
          <div className="animate-stagger-in" style={{ '--stagger-index': 0 } as React.CSSProperties}>
            <QuickStatCard
              label={t('dashboard.income', 'Income')}
              value={currentMonth?.income || 0}
              change={5.2}
              isPositive
              formatCurrency={formatCurrency}
            />
          </div>
          <div className="animate-stagger-in" style={{ '--stagger-index': 1 } as React.CSSProperties}>
            <QuickStatCard
              label={t('dashboard.expenses', 'Expenses')}
              value={currentMonth?.expenses || 0}
              change={-2.1}
              isPositive={false}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>

        <SavingsRateCard rate={savingsRate} />

        {/* 7. Recent Transactions */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('dashboard.recentTransactions', 'Recent')}
            </h3>
            <Link
              to="/transactions"
              className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-0.5"
            >
              {t('viewAll')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.slice(0, 5).map((tx, idx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 animate-stagger-in"
                  style={{ '--stagger-index': idx } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                      tx.type === 'income'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    )}>
                      {tx.type === 'income' ? '+' : '-'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {tx.description || tx.category}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(tx.date, 'MM/dd')}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold font-numbers',
                    tx.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-gray-100'
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{formatTransactionCurrency(Math.abs(tx.amount), tx.currency || 'JPY')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={<Receipt />}
              title={t('emptyState.dashboardRecent.title', 'No recent activity')}
              description={t('emptyState.dashboardRecent.description', 'Your latest transactions will appear here')}
              action={
                <Link to="/transactions" className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {t('emptyState.transactions.cta', 'Add Transaction')}
                </Link>
              }
            />
          )}
        </Card>

        {/* 8. Spending Calendar */}
        <SpendingCalendar onDayClick={handleDayClick} />

        {/* 9. Goals Progress (limit 2) */}
        {goalsProgress && goalsProgress.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('dashboard.goals', 'Goals')}
              </h3>
              <Link
                to="/goals"
                className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-0.5"
              >
                {t('viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {goalsProgress.slice(0, 2).map((progress, idx) => (
                progress.achievability && (
                  <div
                    key={progress.goal_id}
                    className="animate-stagger-in"
                    style={{ '--stagger-index': idx } as React.CSSProperties}
                  >
                    <MiniGoalCard
                      years={progress.years}
                      progress={progress}
                      formatCurrency={formatTransactionCurrency}
                    />
                  </div>
                )
              ))}
            </div>
          </Card>
        )}

        {/* Fallback for no goals */}
        {(!goalsProgress || goalsProgress.length === 0) && goals && goals.length === 0 && (
          <Link to="/goals">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                  <Target className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {t('dashboard.createFirstGoal', 'Create your first goal')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('dashboard.goalMotivation', 'Track your savings progress')}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        )}
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
