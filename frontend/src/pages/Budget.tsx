import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Plus,
  TrendingUp,
  Wallet,
  PiggyBank,
  Target,
  AlertTriangle,
  Check
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BudgetGenerateForm } from '@/components/budget/budget-generate-form'
import { BudgetFeedbackForm } from '@/components/budget/budget-feedback-form'
import { AddCategoryModal } from '@/components/budget/add-category-modal'
import { AllocationCard } from '@/components/budget/allocation-card'
import { BudgetDetailPanel } from '@/components/budget/budget-detail-panel'
import { BudgetProjectionCard } from '@/components/budget/budget-projection-card'
import { BudgetConfirmDialog } from '@/components/budget/budget-confirm-dialog'
import { BudgetDonutChart } from '@/components/budget/budget-donut-chart'
import { SpendingAlert } from '@/components/budget/spending-alert'
import { generateBudget, regenerateBudget, getBudgetByMonth, getBudgetTracking, getBudgetSuggestions } from '@/services/budget-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useXPGain } from '@/hooks/useXPGain'
import { cn } from '@/utils/cn'
import type { Budget } from '@/types'

export function BudgetPage() {
  const { t, i18n } = useTranslation('common')
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [draftBudget, setDraftBudget] = useState<Budget | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [undoStack, setUndoStack] = useState<{ action: string; data: Budget }[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Category interaction state
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Toggle mobile accordion
  const handleToggleExpand = useCallback((category: string) => {
    setExpandedCategory(prev => prev === category ? null : category)
  }, [])

  // XP Gain hook
  const { showBudgetCreatedXP } = useXPGain()

  // Open desktop detail panel
  const handleOpenDetail = useCallback((category: string) => {
    setSelectedCategory(category)
  }, [])

  // Close desktop detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedCategory(null)
  }, [])

  // Format currency helper
  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
  }

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setSelectedMonth(current => {
      const [year, month] = current.split('-').map(Number)
      let newYear = year
      let newMonth = month

      if (direction === 'prev') {
        newMonth -= 1
        if (newMonth < 1) {
          newMonth = 12
          newYear -= 1
        }
      } else {
        newMonth += 1
        if (newMonth > 12) {
          newMonth = 1
          newYear += 1
        }
      }

      return `${newYear}-${String(newMonth).padStart(2, '0')}`
    })
  }, [])

  const { data: savedBudget, isLoading, error } = useQuery({
    queryKey: ['budget', 'month', selectedMonth],
    queryFn: async () => {
      try {
        return await getBudgetByMonth(selectedMonth)
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return null
        }
        throw err
      }
    },
    retry: false,
  })

  const { data: previousMonthData } = useQuery({
    queryKey: ['budget', 'previous-month', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number)
      let prevYear = year
      let prevMonth = month - 1
      if (prevMonth < 1) {
        prevMonth = 12
        prevYear -= 1
      }
      const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`
      try {
        return await getBudgetByMonth(prevMonthStr)
      } catch {
        return null
      }
    },
    enabled: !!savedBudget,
    staleTime: 5 * 60 * 1000,
  })

  const { data: tracking } = useQuery({
    queryKey: ['budget', 'tracking', selectedMonth],
    queryFn: async () => {
      try {
        return await getBudgetTracking()
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return null
        }
        throw err
      }
    },
    retry: false,
    enabled: !!savedBudget,
  })

  const { data: suggestions } = useQuery({
    queryKey: ['budget', 'suggestions'],
    queryFn: getBudgetSuggestions,
    enabled: !savedBudget && !isLoading,
  })

  const generateMutation = useMutation({
    mutationFn: (income: number) => generateBudget({
      monthly_income: income,
      language: i18n.language
    }),
    onSuccess: (data) => {
      setDraftBudget(data)
      pushUndo('generate', data)
      showBudgetCreatedXP()
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: (feedback: string) =>
      regenerateBudget((draftBudget || savedBudget)!.id, {
        feedback,
        language: i18n.language
      }),
    onSuccess: (data) => {
      setDraftBudget(data)
      setShowFeedbackForm(false)
      pushUndo('regenerate', data)
    },
  })

  const pushUndo = useCallback((action: string, data: Budget) => {
    setUndoStack(prev => [...prev.slice(-9), { action, data }])
  }, [])

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const lastAction = undoStack[undoStack.length - 1]
    setDraftBudget(lastAction.data)
    setUndoStack(prev => prev.slice(0, -1))
  }, [undoStack])

  const handleSaveClick = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmSave = async () => {
    await queryClient.refetchQueries({ queryKey: ['budget'] })
    setDraftBudget(null)
    setShowConfirmDialog(false)
  }

  const displayBudget = draftBudget || savedBudget
  const isDraft = !!draftBudget

  const totalAllocated = displayBudget?.allocations.reduce((sum, a) => sum + a.amount, 0) || 0
  const totalBudget = (displayBudget?.monthly_income || 0) - (displayBudget?.savings_target || 0)
  const remainingBudget = totalBudget - totalAllocated

  const spentSoFar = tracking?.total_spent || 0
  const spentPercent = totalAllocated > 0 ? (spentSoFar / totalAllocated) * 100 : 0

  // Calculate health status based on actual spending vs allocated budget
  const getHealthStatus = () => {
    if (spentSoFar > totalAllocated) return { status: 'danger', label: t('budget.health.overBudgetStatus'), color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' }
    if (spentPercent > 95) return { status: 'warning', label: t('budget.health.almostFull'), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' }
    if (spentPercent > 85) return { status: 'caution', label: t('budget.health.warningNearLimit'), color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' }
    return { status: 'good', label: t('budget.health.onTrack'), color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' }
  }

  const health = getHealthStatus()

  const handleExportBudget = useCallback(() => {
    if (!displayBudget) return

    const content = `${t('budget.title')} - ${displayBudget.month}
${t('budget.monthlyIncome')}: ${formatCurrency(displayBudget.monthly_income)}
${t('budget.savingsTarget')}: ${formatCurrency(displayBudget.savings_target || 0)}

${t('budget.allocations')}:
${displayBudget.allocations.map(a => `- ${a.category}: ${formatCurrency(a.amount)}`).join('\n')}

${t('budget.aiAdvice')}: ${displayBudget.advice || '-'}
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-${displayBudget.month}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [displayBudget, t])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatMonth(selectedMonth)}
            </h1>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              disabled={selectedMonth >= new Date().toISOString().slice(0, 7)}
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Title and Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t('budget.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('budget.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {undoStack.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  title={t('undo')}
                >
                  <History className="w-5 h-5" />
                </button>
              )}
              {displayBudget && (
                <button
                  onClick={handleExportBudget}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  title={t('export')}
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Empty State / Generate Form */}
        {!displayBudget && !error && (
          <BudgetGenerateForm
            onGenerate={(income) => generateMutation.mutate(income)}
            isLoading={generateMutation.isPending}
            error={generateMutation.isError}
            suggestions={suggestions}
          />
        )}

        {/* Budget exists */}
        {displayBudget && (
          <>
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
            {displayBudget && displayBudget.allocations.length > 0 && (
              <BudgetDonutChart
                allocations={displayBudget.allocations}
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
                  {formatCurrency(displayBudget.monthly_income)}
                </p>
                {previousMonthData && (displayBudget.monthly_income - previousMonthData.monthly_income) !== 0 && (
                  <p className={cn(
                    'text-xs mt-1',
                    displayBudget.monthly_income > previousMonthData.monthly_income
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}>
                    {displayBudget.monthly_income > previousMonthData.monthly_income ? '+' : ''}
                    {formatCurrency(displayBudget.monthly_income - previousMonthData.monthly_income)}
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
                  {formatCurrency(displayBudget.savings_target || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('budget.percentOfIncome', {
                    percent: Math.round(((displayBudget.savings_target || 0) / displayBudget.monthly_income) * 100)
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

            {/* Category Breakdown - Horizontal Scroll */}
            {tracking && tracking.categories && tracking.categories.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {t('budget.spendingByCategory')}
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {tracking.categories.slice(0, 10).map((cat, idx) => {
                    const statusIcon = cat.status === 'red' ? '🚨' :
                      cat.status === 'orange' ? '⚠️' : '✅'
                    return (
                      <div
                        key={idx}
                        className="flex-shrink-0 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg min-w-[160px]"
                        role="article"
                        aria-label={`${cat.category}: ${Math.round(cat.percentage)}% used, ${formatCurrency(cat.remaining)} remaining`}
                      >
                        {/* Category name with status */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {cat.category}
                          </p>
                          <span className="flex-shrink-0 text-sm" aria-hidden="true">{statusIcon}</span>
                        </div>
                        {/* Spent amount */}
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(cat.spent)}
                        </p>
                        {/* Progress bar with percentage */}
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={Math.min(100, cat.percentage)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                cat.status === 'red' ? 'bg-red-500' :
                                cat.status === 'orange' ? 'bg-orange-500' :
                                cat.status === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                              )}
                              style={{ width: `${Math.min(100, cat.percentage)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                            {Math.round(cat.percentage)}%
                          </span>
                        </div>
                        {/* Remaining amount */}
                        <p className={cn(
                          'text-xs mt-1',
                          cat.remaining >= 0
                            ? 'text-gray-500 dark:text-gray-400'
                            : 'text-red-600 dark:text-red-400'
                        )}>
                          {cat.remaining >= 0
                            ? `${formatCurrency(cat.remaining)} ${t('budget.remaining', { amount: '' }).trim()}`
                            : `${formatCurrency(Math.abs(cat.remaining))} ${t('budget.exceeded', { amount: '' }).trim()}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Regenerate Button (Draft Mode) */}
            {isDraft && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                  className="flex-1"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  {t('budget.regenerate')}
                </Button>
                <Button onClick={handleSaveClick} className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  {t('budget.save')}
                </Button>
              </div>
            )}

            {/* Feedback Form */}
            {showFeedbackForm && (
              <BudgetFeedbackForm
                onSubmit={(feedback) => regenerateMutation.mutate(feedback)}
                onCancel={() => setShowFeedbackForm(false)}
                isLoading={regenerateMutation.isPending}
              />
            )}

            {/* Smart Spending Alerts */}
            {tracking && tracking.categories && tracking.categories.length > 0 && (
              <SpendingAlert
                categories={tracking.categories}
                daysRemaining={tracking.days_remaining}
                onViewCategory={(category) => setSelectedCategory(category)}
              />
            )}

            {/* Allocations Section Header */}
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('budget.allocations')}
              </h3>
              {isDraft && (
                <Button variant="outline" size="sm" onClick={() => setShowAddCategory(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('budget.addCategory')}
                </Button>
              )}
            </div>

            {/* Allocations List - Using AllocationCard for accordion functionality */}
            {displayBudget.allocations.map((allocation) => {
              const trackingItem = tracking?.categories?.find(c => c.category === allocation.category)

              return (
                <AllocationCard
                  key={allocation.category}
                  allocation={allocation}
                  trackingItem={trackingItem}
                  totalBudget={totalBudget}
                  month={selectedMonth}
                  isExpanded={expandedCategory === allocation.category}
                  onToggleExpand={handleToggleExpand}
                  onOpenDetail={handleOpenDetail}
                  className={isDraft ? 'border-dashed border-blue-300 dark:border-blue-700' : ''}
                />
              )
            })}

            {/* AI Advice */}
            {displayBudget.advice && (
              <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                      {t('budget.aiAdvice')}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {displayBudget.advice}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : t('budget.generateError')}
            </p>
          </Card>
        )}

        {/* Add Category Modal */}
        {showAddCategory && displayBudget && (
          <AddCategoryModal
            budget={displayBudget}
            onClose={() => setShowAddCategory(false)}
            onAdd={(category, amount) => {
              const newAllocations = [...displayBudget.allocations, { category, amount }]
              const newTotalAllocated = newAllocations.reduce((sum, a) => sum + a.amount, 0)
              const newSavingsTarget = Math.max(0, displayBudget.monthly_income - newTotalAllocated)
              setDraftBudget({
                ...displayBudget,
                allocations: newAllocations,
                savings_target: newSavingsTarget
              })
              setShowAddCategory(false)
              pushUndo('add-category', displayBudget)
            }}
          />
        )}
      </div>

      {/* FAB for quick add (mobile only) */}
      {displayBudget && isDraft && (
        <div className="fixed bottom-20 right-4 sm:hidden">
          <Button
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => setShowAddCategory(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Desktop Detail Panel */}
      <BudgetDetailPanel
        category={selectedCategory || ''}
        month={selectedMonth}
        trackingItem={selectedCategory ? tracking?.categories?.find(c => c.category === selectedCategory) : undefined}
        isOpen={!!selectedCategory}
        onClose={handleCloseDetail}
      />

      {/* Save Confirmation Dialog */}
      <BudgetConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirmDialog(false)}
        monthlyIncome={displayBudget?.monthly_income || 0}
        totalAllocated={totalAllocated}
        savingsTarget={displayBudget?.savings_target || 0}
        categoryCount={displayBudget?.allocations.length || 0}
      />
    </div>
  )
}

// Refresh icon component
function RefreshCcw({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}
