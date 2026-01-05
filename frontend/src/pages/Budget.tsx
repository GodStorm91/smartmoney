import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BudgetGenerateForm } from '@/components/budget/budget-generate-form'
import { BudgetSummaryCard } from '@/components/budget/budget-summary-card'
import { BudgetFeedbackForm } from '@/components/budget/budget-feedback-form'
import { BudgetProjectionCard } from '@/components/budget/budget-projection-card'
import { BudgetAllocationList } from '@/components/budget/budget-allocation-list'
import { getCurrentBudget, generateBudget, regenerateBudget, getBudgetTracking, getBudgetSuggestions } from '@/services/budget-service'
import type { Budget } from '@/types'

export function BudgetPage() {
  const { t, i18n } = useTranslation('common')
  const queryClient = useQueryClient()
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [draftBudget, setDraftBudget] = useState<Budget | null>(null)

  // Fetch current budget (saved budget from database)
  // Note: 404 means no budget exists yet (expected state)
  const { data: savedBudget, isLoading, error } = useQuery({
    queryKey: ['budget', 'current'],
    queryFn: async () => {
      try {
        return await getCurrentBudget()
      } catch (err: any) {
        // 404 is expected when no budget exists, return null instead of error
        if (err?.response?.status === 404) {
          return null
        }
        throw err
      }
    },
    retry: false,
  })

  // Fetch budget tracking data (actual spending vs budget)
  const { data: tracking } = useQuery({
    queryKey: ['budget', 'tracking'],
    queryFn: async () => {
      try {
        return await getBudgetTracking()
      } catch (err: any) {
        // 404 is expected when no budget exists
        if (err?.response?.status === 404) {
          return null
        }
        throw err
      }
    },
    retry: false,
    enabled: !!savedBudget, // Only fetch if budget exists
  })

  // Fetch suggestions from previous month (only when no current budget)
  const { data: suggestions } = useQuery({
    queryKey: ['budget', 'suggestions'],
    queryFn: getBudgetSuggestions,
    enabled: !savedBudget && !isLoading, // Only fetch when no current budget
  })

  // Generate budget mutation (creates draft, doesn't save)
  const generateMutation = useMutation({
    mutationFn: (income: number) => generateBudget({
      monthly_income: income,
      language: i18n.language
    }),
    onSuccess: (data) => {
      // Store as draft, not saved yet
      setDraftBudget(data)
    },
  })

  // Regenerate budget mutation (creates new draft)
  const regenerateMutation = useMutation({
    mutationFn: (feedback: string) =>
      regenerateBudget((draftBudget || savedBudget)!.id, {
        feedback,
        language: i18n.language
      }),
    onSuccess: (data) => {
      // Update draft with new budget
      setDraftBudget(data)
      setShowFeedbackForm(false)
    },
  })

  // Save budget - budget is already saved by regenerate endpoint
  // This just clears the draft state and refreshes the UI
  const handleSave = async () => {
    // First refetch and wait for completion to get fresh data from server
    await queryClient.refetchQueries({ queryKey: ['budget'] })
    // Then clear draft so UI shows the freshly fetched saved budget
    setDraftBudget(null)
  }

  // Use draft if available, otherwise use saved budget
  const displayBudget = draftBudget || savedBudget
  const isDraft = !!draftBudget

  const totalAllocated = displayBudget?.allocations.reduce((sum, a) => sum + a.amount, 0) || 0
  const totalBudget = (displayBudget?.monthly_income || 0) - (displayBudget?.savings_target || 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('budget.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('budget.subtitle')}</p>
      </div>

      {/* No budget exists - show generation form */}
      {!displayBudget && !error && (
        <BudgetGenerateForm
          onGenerate={(income) => generateMutation.mutate(income)}
          isLoading={generateMutation.isPending}
          error={generateMutation.isError}
          suggestions={suggestions}
        />
      )}

      {/* Budget exists (draft or saved) - show budget details */}
      {displayBudget && (
        <div className="space-y-6">
          <BudgetSummaryCard
            budget={displayBudget}
            totalAllocated={totalAllocated}
            isDraft={isDraft}
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

          {/* Show projection only for saved budgets with tracking data */}
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
            onAllocationChange={(updatedAllocations) => {
              if (displayBudget) {
                // Calculate new total allocated
                const newTotalAllocated = updatedAllocations.reduce((sum, a) => sum + a.amount, 0)

                // Recalculate savings target: savings_target = monthly_income - total_allocated
                const newSavingsTarget = Math.max(0, displayBudget.monthly_income - newTotalAllocated)

                setDraftBudget({
                  ...displayBudget,
                  allocations: updatedAllocations,
                  savings_target: newSavingsTarget
                })
              }
            }}
          />
        </div>
      )}

      {/* Error state - only for real errors, not 404 */}
      {error && (
        <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : t('budget.generateError')}
          </p>
        </Card>
      )}
    </div>
  )
}
