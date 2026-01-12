import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Download, History } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BudgetGenerateForm } from '@/components/budget/budget-generate-form'
import { BudgetSummaryCard } from '@/components/budget/budget-summary-card'
import { BudgetFeedbackForm } from '@/components/budget/budget-feedback-form'
import { BudgetProjectionCard } from '@/components/budget/budget-projection-card'
import { BudgetAllocationList } from '@/components/budget/budget-allocation-list'
import { BudgetHealthIndicator } from '@/components/budget/budget-health-indicator'
import { AddCategoryModal } from '@/components/budget/add-category-modal'
import { generateBudget, regenerateBudget, getBudgetByMonth, getBudgetTracking, getBudgetSuggestions } from '@/services/budget-service'
import type { Budget } from '@/types'

export function BudgetPage() {
  const { t, i18n } = useTranslation('common')
  const queryClient = useQueryClient()
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [draftBudget, setDraftBudget] = useState<Budget | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [undoStack, setUndoStack] = useState<{ action: string; data: Budget }[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)

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

  const handleSave = async () => {
    await queryClient.refetchQueries({ queryKey: ['budget'] })
    setDraftBudget(null)
  }

  const displayBudget = draftBudget || savedBudget
  const isDraft = !!draftBudget

  const totalAllocated = displayBudget?.allocations.reduce((sum, a) => sum + a.amount, 0) || 0
  const totalBudget = (displayBudget?.monthly_income || 0) - (displayBudget?.savings_target || 0)

  const handleExportBudget = useCallback(() => {
    if (!displayBudget) return

    const content = `${t('budget.title')} - ${displayBudget.month}
${t('budget.monthlyIncome')}: ${displayBudget.monthly_income}
${t('budget.savingsTarget')}: ${displayBudget.savings_target || 0}

${t('budget.allocations')}:
${displayBudget.allocations.map(a => `- ${a.category}: ${a.amount}`).join('\n')}

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('budget.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('budget.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {undoStack.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleUndo}>
                <History className="w-4 h-4 mr-1" />
                {t('common.undo')}
              </Button>
            )}
            {displayBudget && (
              <Button variant="outline" size="sm" onClick={handleExportBudget}>
                <Download className="w-4 h-4 mr-1" />
                {t('common.export')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="px-3"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-4 font-semibold min-w-[180px] text-center">
            {formatMonth(selectedMonth)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="px-3"
            disabled={selectedMonth >= new Date().toISOString().slice(0, 7)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!displayBudget && !error && (
        <BudgetGenerateForm
          onGenerate={(income) => generateMutation.mutate(income)}
          isLoading={generateMutation.isPending}
          error={generateMutation.isError}
          suggestions={suggestions}
        />
      )}

      {displayBudget && (
        <div className="space-y-6">
          {tracking && (
            <BudgetHealthIndicator
              totalBudget={totalBudget}
              totalAllocated={totalAllocated}
              tracking={tracking}
            />
          )}

          <BudgetSummaryCard
            budget={displayBudget}
            totalAllocated={totalAllocated}
            isDraft={isDraft}
            previousMonth={previousMonthData || undefined}
            onRegenerateClick={() => setShowFeedbackForm(!showFeedbackForm)}
            onSaveClick={handleSave}
            isSaving={false}
          />

          {showFeedbackForm && (
            <BudgetFeedbackForm
              onSubmit={(feedback) => regenerateMutation.mutate(feedback)}
              onCancel={() => setShowFeedbackForm(false)}
              isLoading={regenerateMutation.isPending}
            />
          )}

          {!isDraft && tracking && (
            <BudgetProjectionCard
              budget={displayBudget}
              tracking={tracking}
            />
          )}

          <BudgetAllocationList
            budgetId={displayBudget.id}
            allocations={displayBudget.allocations}
            totalBudget={totalBudget}
            tracking={tracking || undefined}
            month={displayBudget.month}
            isDraft={isDraft}
            onAddCategory={() => setShowAddCategory(true)}
            onAllocationChange={(updatedAllocations) => {
              if (displayBudget) {
                const newTotalAllocated = updatedAllocations.reduce((sum, a) => sum + a.amount, 0)
                const newSavingsTarget = Math.max(0, displayBudget.monthly_income - newTotalAllocated)
                setDraftBudget({
                  ...displayBudget,
                  allocations: updatedAllocations,
                  savings_target: newSavingsTarget
                })
                pushUndo('edit', displayBudget)
              }
            }}
          />
        </div>
      )}

      {error && (
        <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : t('budget.generateError')}
          </p>
        </Card>
      )}

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
  )
}
