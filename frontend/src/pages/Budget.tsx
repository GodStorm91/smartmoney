import { useState, useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Download, Plus, Check, CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BudgetCreationWizard } from '@/components/budget/budget-creation-wizard'
import { BudgetFeedbackForm } from '@/components/budget/budget-feedback-form'
import { AddCategoryModal } from '@/components/budget/add-category-modal'
import { BudgetConfirmDialog } from '@/components/budget/budget-confirm-dialog'
import { BudgetTabsContainer } from '@/components/budget/budget-tabs-container'
import { BudgetVersionDropdown } from '@/components/budget/budget-version-dropdown'
import { OverviewTab } from '@/components/budget/tabs/overview-tab'
import { CategoriesTab } from '@/components/budget/tabs/categories-tab'
import { TransactionsTab } from '@/components/budget/tabs/transactions-tab'
import { ForecastTab } from '@/components/budget/tabs/forecast-tab'
import { TransactionEditModal } from '@/components/transactions/TransactionEditModal'
import {
  generateBudget, regenerateBudget, getBudgetByMonth, getBudgetTracking,
  getBudgetSuggestions, previewBudgetCopy, copyBudget, getBudgetVersions, restoreBudgetVersion
} from '@/services/budget-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useXPGain } from '@/hooks/useXPGain'
import { useBudgetTabState } from '@/hooks/useBudgetTabState'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'
import type { Budget, Transaction } from '@/types'
import type { BudgetTab } from '@/hooks/useBudgetTabState'

const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const getPrevMonthStr = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const pm = m - 1 < 1 ? 12 : m - 1
  const py = m - 1 < 1 ? y - 1 : y
  return `${py}-${String(pm).padStart(2, '0')}`
}

export function BudgetPage() {
  const { t, i18n } = useTranslation('common')
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [draftBudget, setDraftBudget] = useState<Budget | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth)
  const [undoStack, setUndoStack] = useState<{ action: string; data: Budget }[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const { activeTab, setActiveTab } = useBudgetTabState('overview')
  const { showBudgetCreatedXP } = useXPGain()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
  }

  const isCurrentMonth = selectedMonth === getCurrentMonth()

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setSelectedMonth(current => {
      const [year, month] = current.split('-').map(Number)
      let ny = year, nm = month
      if (direction === 'prev') { nm -= 1; if (nm < 1) { nm = 12; ny -= 1 } }
      else { nm += 1; if (nm > 12) { nm = 1; ny += 1 } }
      return `${ny}-${String(nm).padStart(2, '0')}`
    })
  }, [])

  const goToCurrentMonth = useCallback(() => setSelectedMonth(getCurrentMonth()), [])

  // --- Queries ---
  const { data: savedBudget, isLoading, error } = useQuery({
    queryKey: ['budget', 'month', selectedMonth],
    queryFn: async () => {
      try { return await getBudgetByMonth(selectedMonth) }
      catch (err: any) { if (err?.response?.status === 404) return null; throw err }
    },
    retry: false,
  })

  const { data: previousMonthData } = useQuery({
    queryKey: ['budget', 'previous-month', selectedMonth],
    queryFn: async () => {
      try { return await getBudgetByMonth(getPrevMonthStr(selectedMonth)) }
      catch { return null }
    },
    enabled: !!savedBudget,
    staleTime: 5 * 60 * 1000,
  })

  const { data: tracking } = useQuery({
    queryKey: ['budget', 'tracking', selectedMonth],
    queryFn: async () => {
      try { return await getBudgetTracking(selectedMonth) }
      catch (err: any) { if (err?.response?.status === 404) return null; throw err }
    },
    retry: false,
    enabled: !!savedBudget,
  })

  const { data: suggestions } = useQuery({
    queryKey: ['budget', 'suggestions'],
    queryFn: getBudgetSuggestions,
    enabled: !savedBudget && !isLoading,
  })

  const { data: copyPreview, isLoading: isCopyPreviewLoading } = useQuery({
    queryKey: ['budget', 'copy-preview', selectedMonth],
    queryFn: () => previewBudgetCopy(getPrevMonthStr(selectedMonth), selectedMonth),
    enabled: !savedBudget && !isLoading && !draftBudget,
    retry: false,
  })

  const { data: versions } = useQuery({
    queryKey: ['budget', 'versions', selectedMonth],
    queryFn: () => getBudgetVersions(selectedMonth),
    enabled: !!savedBudget,
  })

  // --- Mutations ---
  const generateMutation = useMutation({
    mutationFn: (income: number) => generateBudget({ monthly_income: income, language: i18n.language }),
    onSuccess: (data) => { setDraftBudget(data); pushUndo('generate', data); showBudgetCreatedXP() },
  })

  const regenerateMutation = useMutation({
    mutationFn: (feedback: string) => regenerateBudget((draftBudget || savedBudget)!.id, { feedback, language: i18n.language }),
    onSuccess: (data) => { setDraftBudget(data); setShowFeedbackForm(false); pushUndo('regenerate', data) },
  })

  const copyMutation = useMutation({
    mutationFn: () => copyBudget({ source_month: getPrevMonthStr(selectedMonth), target_month: selectedMonth }),
    onSuccess: (data) => { setDraftBudget(data); queryClient.invalidateQueries({ queryKey: ['budget'] }) },
  })

  const restoreMutation = useMutation({
    mutationFn: (budgetId: number) => restoreBudgetVersion(budgetId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['budget'] }) },
  })

  // --- Helpers ---
  const pushUndo = useCallback((action: string, data: Budget) => {
    setUndoStack(prev => [...prev.slice(-9), { action, data }])
  }, [])

  const displayBudget = draftBudget || savedBudget
  const isDraft = !!draftBudget
  const totalAllocated = displayBudget?.allocations.reduce((sum, a) => sum + a.amount, 0) || 0

  // Compute budget health color
  const healthColor = useMemo(() => {
    if (!tracking) return null
    const ratio = tracking.total_spent / (tracking.total_budgeted || 1)
    if (ratio > 1) return 'bg-red-500'
    if (ratio > 0.85) return 'bg-amber-500'
    return 'bg-green-500'
  }, [tracking])

  // Compute alert tabs
  const alertTabs = useMemo<BudgetTab[]>(() => {
    if (!tracking) return []
    const tabs: BudgetTab[] = []
    if (tracking.categories.some(c => c.status === 'red')) tabs.push('categories')
    const totalRatio = tracking.total_spent / (tracking.total_budgeted || 1)
    if (totalRatio > 1) tabs.push('forecast')
    return tabs
  }, [tracking])

  const handleExportBudget = useCallback(() => {
    if (!displayBudget) return
    const content = `${t('budget.title')} - ${displayBudget.month}\n${t('budget.monthlyIncome')}: ${formatCurrency(displayBudget.monthly_income)}\n${t('budget.savingsTarget')}: ${formatCurrency(displayBudget.savings_target || 0)}\n\n${t('budget.allocations')}:\n${displayBudget.allocations.map(a => `- ${a.category}: ${formatCurrency(a.amount)}`).join('\n')}\n\n${t('budget.aiAdvice')}: ${displayBudget.advice || '-'}\n`
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
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatMonth(selectedMonth)}
              </h1>
              {healthColor && (
                <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', healthColor)} title={t('budget.health.title')} />
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center text-green-600 dark:text-green-400"
                  title={t('common.today')}
                >
                  <CalendarDays className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                disabled={selectedMonth >= new Date().toISOString().slice(0, 7)}
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
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
              {versions && versions.length > 1 && displayBudget && (
                <BudgetVersionDropdown
                  versions={versions}
                  currentVersion={displayBudget.version || 1}
                  formatCurrency={formatCurrency}
                  onRestore={(id) => restoreMutation.mutate(id)}
                  isRestoring={restoreMutation.isPending}
                />
              )}
              {displayBudget && (
                <button
                  onClick={handleExportBudget}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
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
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Empty State — Creation Wizard */}
        {!displayBudget && !error && (
          <BudgetCreationWizard
            copyPreview={copyPreview}
            isCopyPreviewLoading={isCopyPreviewLoading}
            suggestions={suggestions}
            selectedMonth={selectedMonth}
            formatCurrency={formatCurrency}
            formatMonth={formatMonth}
            onCopy={() => copyMutation.mutate()}
            onGenerate={(income) => generateMutation.mutate(income)}
            onStartEmpty={() => {
              setDraftBudget({
                id: 0,
                month: selectedMonth,
                monthly_income: copyPreview?.source_budget?.monthly_income || 0,
                allocations: [],
                created_at: new Date().toISOString()
              })
            }}
            isCopyLoading={copyMutation.isPending}
            isGenerateLoading={generateMutation.isPending}
            generateError={generateMutation.isError}
          />
        )}

        {/* Budget exists — Tabbed Interface */}
        {displayBudget && (
          <BudgetTabsContainer activeTab={activeTab} onTabChange={setActiveTab} alertTabs={alertTabs}>
            {activeTab === 'overview' && (
              <OverviewTab budget={displayBudget} tracking={tracking || undefined} previousMonthData={previousMonthData} selectedMonth={selectedMonth} onViewCategory={() => setActiveTab('categories')} />
            )}
            {activeTab === 'categories' && (
              <CategoriesTab budget={displayBudget} tracking={tracking || undefined} isDraft={isDraft} selectedMonth={selectedMonth} onAddCategory={() => setShowAddCategory(true)} onAllocationChange={(allocs) => { if (isDraft) setDraftBudget({ ...displayBudget, allocations: allocs }) }} />
            )}
            {activeTab === 'transactions' && (
              <TransactionsTab allocations={displayBudget.allocations} month={selectedMonth} onEditTransaction={setEditingTransaction} />
            )}
            {activeTab === 'forecast' && (
              <ForecastTab budget={displayBudget} tracking={tracking || undefined} selectedMonth={selectedMonth} onViewCategory={() => setActiveTab('categories')} />
            )}

            {/* Draft Mode Actions */}
            {isDraft && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowFeedbackForm(!showFeedbackForm)} className="flex-1">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  {t('budget.regenerate')}
                </Button>
                <Button onClick={() => setShowConfirmDialog(true)} className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  {t('budget.save')}
                </Button>
              </div>
            )}

            {showFeedbackForm && (
              <BudgetFeedbackForm
                onSubmit={(feedback) => regenerateMutation.mutate(feedback)}
                onCancel={() => setShowFeedbackForm(false)}
                isLoading={regenerateMutation.isPending}
              />
            )}
          </BudgetTabsContainer>
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
              const newAllocs = [...displayBudget.allocations, { category, amount }]
              setDraftBudget({ ...displayBudget, allocations: newAllocs, savings_target: Math.max(0, displayBudget.monthly_income - newAllocs.reduce((s, a) => s + a.amount, 0)) })
              setShowAddCategory(false)
              pushUndo('add-category', displayBudget)
            }}
          />
        )}
      </div>

      {/* FAB for quick add (mobile only) */}
      {displayBudget && isDraft && (
        <div className="fixed bottom-20 right-4 sm:hidden">
          <Button size="lg" className="rounded-full shadow-lg" onClick={() => setShowAddCategory(true)}>
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Transaction Edit Modal */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => { setEditingTransaction(null); queryClient.invalidateQueries({ queryKey: ['budget', 'tracking'] }) }}
        />
      )}

      {/* Save Confirmation Dialog */}
      <BudgetConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={async () => { await queryClient.refetchQueries({ queryKey: ['budget'] }); setDraftBudget(null); setShowConfirmDialog(false); toast.success(t('budget.saved', 'Budget saved')) }}
        onCancel={() => setShowConfirmDialog(false)}
        monthlyIncome={displayBudget?.monthly_income || 0}
        totalAllocated={totalAllocated}
        savingsTarget={displayBudget?.savings_target || 0}
        categoryCount={displayBudget?.allocations.length || 0}
      />
    </div>
  )
}

function RefreshCcw({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}
