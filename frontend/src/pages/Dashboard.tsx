import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target,
  Plus,
  Camera,
  Upload,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Bell
} from 'lucide-react'
import { GoalAchievabilityCard } from '@/components/goals/GoalAchievabilityCard'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { formatMonth, formatDateShort } from '@/utils/formatDate'
import { fetchDashboardSummary, fetchMonthlyTrends, fetchCategoryBreakdown } from '@/services/analytics-service'
import { fetchGoals, fetchGoalProgress } from '@/services/goal-service'
import { fetchTransactions } from '@/services/transaction-service'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'

// Navigation date state
const [currentDate, setCurrentDate] = useState(new Date())

export function Dashboard() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => fetchDashboardSummary(),
  })

  const { data: monthlyTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['monthly-trends', 12],
    queryFn: () => fetchMonthlyTrends(12),
  })

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['category-breakdown'],
    queryFn: () => fetchCategoryBreakdown(),
  })

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })

  const { data: goalsProgress, isLoading: goalsProgressLoading } = useQuery({
    queryKey: ['goals-progress', goals?.map(g => g.id)],
    queryFn: async () => {
      if (!goals || goals.length === 0) return []
      return Promise.all(
        goals.map(goal => fetchGoalProgress(goal.id, true))
      )
    },
    enabled: !!goals && goals.length > 0,
  })

  // Fetch recent transactions for quick view
  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions', 5],
    queryFn: async () => {
      const transactions = await fetchTransactions({ limit: 5 })
      return transactions
    },
  })

  const isLoading = summaryLoading || trendsLoading || categoriesLoading || goalsLoading

  // Calculate savings rate
  const currentMonth = monthlyTrends?.[monthlyTrends.length - 1]
  const savingsRate = currentMonth?.income > 0 
    ? ((currentMonth.income - currentMonth.expenses) / currentMonth.income) * 100 
    : 0

  // Quick actions
  const quickActions = [
    { icon: Plus, label: t('quickActions.add', 'Add'), color: 'bg-primary-500', to: '/transactions?action=add-transaction' },
    { icon: Camera, label: t('quickActions.scan', 'Scan'), color: 'bg-purple-500', to: '/transactions?action=scan-receipt' },
    { icon: Upload, label: t('quickActions.upload', 'Upload'), color: 'bg-blue-500', to: '/upload' },
    { icon: PieChart, label: t('quickActions.analytics', 'Analytics'), color: 'bg-green-500', to: '/analytics' },
    { icon: Wallet, label: t('quickActions.accounts', 'Accounts'), color: 'bg-orange-500', to: '/accounts' },
    { icon: Target, label: t('quickActions.goals', 'Goals'), color: 'bg-pink-500', to: '/goals' },
  ]

  // Smart alerts
  const alerts = []
  if (currentMonth && currentMonth.expenses > currentMonth.income && currentMonth.income > 0) {
    alerts.push({ type: 'danger', message: t('alerts.overspending', 'Overspending') })
  }
  if (savingsRate < 10 && savingsRate >= 0) {
    alerts.push({ type: 'warning', message: t('alerts.lowSavings', 'Low savings') })
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Currency formatter
  const formatCurrency = (amount: number) => 
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  return (
    <div className="min-h-screen pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => {
                const d = new Date(currentDate)
                d.setMonth(d.getMonth() - 1)
                setCurrentDate(d)
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatMonth(currentDate)}
            </h1>
            <button 
              onClick={() => {
                const d = new Date(currentDate)
                d.setMonth(d.getMonth() + 1)
                setCurrentDate(d)
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Greeting */}
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
        {/* Onboarding */}
        <OnboardingChecklist />

        {/* Net Worth Hero */}
        <NetWorthHero summary={summary} savingsRate={savingsRate} />

        {/* Smart Alerts Banner */}
        {alerts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5',
                  alert.type === 'danger' 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                )}
              >
                <Bell className="w-3.5 h-3.5" />
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-3 pb-2 min-w-max">
            {quickActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <Link
                  key={idx}
                  to={action.to}
                  className="flex flex-col items-center gap-1.5 p-1"
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    'transition-transform active:scale-95',
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

        {/* KPI Metrics Row */}
        <KpiRow summary={summary} formatCurrency={formatCurrency} />

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <QuickStatCard
            label={t('dashboard.income', 'Income')}
            value={currentMonth?.income || 0}
            change={5.2}
            isPositive
            formatCurrency={formatCurrency}
          />
          <QuickStatCard
            label={t('dashboard.expenses', 'Expenses')}
            value={currentMonth?.expenses || 0}
            change={-2.1}
            isPositive={false}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* Savings Rate */}
        <SavingsRateCard rate={savingsRate} formatCurrency={formatCurrency} />

        {/* Recent Transactions */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('dashboard.recentTransactions', 'Recent')}
            </h3>
            <Link 
              to="/transactions" 
              className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-0.5"
            >
              {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
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
                        {formatDateShort(tx.date)}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold font-numbers',
                    tx.type === 'income' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-900 dark:text-gray-100'
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {t('dashboard.noTransactions', 'No transactions yet')}
            </p>
          )}
        </Card>

        {/* Category Chips */}
        {categories && categories.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('dashboard.spendingByCategory', 'Spending')}
            </h3>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {categories.slice(0, 8).map((cat, idx) => (
                <span
                  key={idx}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  {cat.category} · {formatCurrency(cat.amount)}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Goals Progress */}
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
                {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {goalsProgress.slice(0, 2).map((progress) => (
                progress.achievability && (
                  <MiniGoalCard
                    key={progress.goal_id}
                    years={progress.years}
                    progress={progress}
                    formatCurrency={formatCurrency}
                  />
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
    </div>
  )
}

// Net Worth Hero Component
function NetWorthHero({ summary, savingsRate }: { summary: any; savingsRate: number }) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const [expanded, setExpanded] = useState(false)

  const netWorth = summary?.net || 0
  const monthlyNet = summary?.net_change || 0

  const formatCurrency = (amount: number) => 
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  return (
    <Card 
      variant="gradient" 
      className={cn(
        'cursor-pointer transition-all duration-300',
        expanded && 'shadow-lg'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
          <Wallet className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('dashboard.netWorth', 'Net Worth')}
        </span>
      </div>
      
      <p className={cn(
        'text-3xl sm:text-4xl font-bold font-numbers tracking-tight',
        netWorth >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'
      )}>
        {formatCurrency(netWorth)}
      </p>

      {monthlyNet !== 0 && (
        <div className={cn(
          'inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium',
          monthlyNet >= 0 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
        )}>
          {monthlyNet >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {monthlyNet >= 0 ? '+' : ''}{formatCurrency(monthlyNet)}
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{t('dashboard.assets', 'Assets')}</p>
              <p className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(summary?.total_income || 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{t('dashboard.expenses', 'Expenses')}</p>
              <p className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(summary?.total_expense || 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// Quick Stats Card
function QuickStatCard({ 
  label, 
  value, 
  change, 
  isPositive, 
  formatCurrency 
}: { 
  label: string
  value: number
  change: number
  isPositive: boolean
  formatCurrency: (amount: number) => string
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold font-numbers text-gray-900 dark:text-gray-100">
        {formatCurrency(value)}
      </p>
      {change !== 0 && (
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs font-medium',
          (isPositive && change > 0) || (!isPositive && change < 0)
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        )}>
          {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      )}
    </Card>
  )
}

// Savings Rate Card
function SavingsRateCard({ rate, formatCurrency }: { rate: number; formatCurrency: (amount: number) => string }) {
  const { t } = useTranslation('common')
  
  const getStatus = () => {
    if (rate >= 20) return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: t('dashboard.savingsGood', 'Healthy') }
    if (rate >= 10) return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', label: t('dashboard.savingsFair', 'Fair') }
    return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: t('dashboard.savingsLow', 'Low') }
  }
  
  const status = getStatus()

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('dashboard.savingsRate', 'Savings Rate')}
        </span>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', status.bg, status.color)}>
          {status.label}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-numbers text-gray-900 dark:text-gray-100">
          {Math.round(rate)}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {t('dashboard.ofIncome', 'of income')}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-3 overflow-hidden">
        <div 
          className={cn(
            'h-full rounded-full transition-all',
            rate >= 20 ? 'bg-green-500' : rate >= 10 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>
    </Card>
  )
}

// Mini Goal Card
function MiniGoalCard({ 
  years, 
  progress, 
  formatCurrency 
}: { 
  years: number
  progress: any
  formatCurrency: (amount: number) => string
}) {
  const { t } = useTranslation('common')
  
  const progressPct = progress.target_amount > 0 
    ? Math.min(100, (progress.total_saved / progress.target_amount) * 100)
    : 0
  
  const isOnTrack = progress.achievability?.current_monthly_net >= progress.achievability?.required_monthly

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        isOnTrack 
          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
      )}>
        {progressPct >= 100 ? '🎉' : `${Math.round(progressPct)}%`}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {t('goals.yearGoal', { years })} · {formatCurrency(progress.total_saved)}
        </p>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mt-1 overflow-hidden">
          <div 
            className={cn(
              'h-full rounded-full',
              isOnTrack ? 'bg-green-500' : 'bg-amber-500'
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </div>
  )
}

// KPI Row Component
function KpiRow({ summary, formatCurrency }: { summary: any; formatCurrency: (amount: number) => string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assets</p>
        <p className="text-sm font-semibold font-numbers text-green-600 dark:text-green-400">
          {formatCurrency(summary?.total_income || 0)}
        </p>
      </div>
      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Liabilities</p>
        <p className="text-sm font-semibold font-numbers text-red-600 dark:text-red-400">
          {formatCurrency(summary?.total_expense || 0)}
        </p>
      </div>
      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transactions</p>
        <p className="text-sm font-semibold font-numbers text-gray-900 dark:text-gray-100">
          {summary?.transaction_count || 0}
        </p>
      </div>
    </div>
  )
}
