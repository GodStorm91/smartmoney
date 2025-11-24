import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BudgetGenerateForm } from '@/components/budget/budget-generate-form'
import { BudgetSummaryCard } from '@/components/budget/budget-summary-card'
import { BudgetFeedbackForm } from '@/components/budget/budget-feedback-form'
import { BudgetAllocationList } from '@/components/budget/budget-allocation-list'
import { getCurrentBudget, generateBudget, regenerateBudget } from '@/services/budget-service'
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

  // Save budget mutation (persist draft to database)
  const saveMutation = useMutation({
    mutationFn: () => generateBudget({
      monthly_income: draftBudget!.monthly_income,
      language: i18n.language
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] })
      setDraftBudget(null) // Clear draft after saving
    },
  })

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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('budget.title')}</h2>
        <p className="text-gray-600">{t('budget.subtitle')}</p>
      </div>

      {/* No budget exists - show generation form */}
      {!displayBudget && !error && (
        <BudgetGenerateForm
          onGenerate={(income) => generateMutation.mutate(income)}
          isLoading={generateMutation.isPending}
          error={generateMutation.isError}
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
            onSaveClick={() => saveMutation.mutate()}
            isSaving={saveMutation.isPending}
          />

          {showFeedbackForm && (
            <BudgetFeedbackForm
              onSubmit={(feedback) => regenerateMutation.mutate(feedback)}
              onCancel={() => setShowFeedbackForm(false)}
              isLoading={regenerateMutation.isPending}
            />
          )}

          <BudgetAllocationList
            allocations={displayBudget.allocations}
            totalBudget={totalBudget}
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
        <Card className="p-6 border-red-200 bg-red-50">
          <p className="text-red-600">
            {error instanceof Error ? error.message : t('budget.generateError')}
          </p>
        </Card>
      )}
    </div>
  )
}
