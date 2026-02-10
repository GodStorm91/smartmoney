import { useTranslation } from 'react-i18next'
import { Sparkles, CheckSquare, Square } from 'lucide-react'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/Button'
import { AiCategorizeReviewRow } from './ai-categorize-review-row'
import { AiCategorizeReviewFooter, ReviewLoadingSkeleton } from './ai-categorize-review-footer'
import { useAiCategorizeReview } from './use-ai-categorize-review'

export interface AiCategorizeReviewModalProps {
  open: boolean
  onClose: () => void
  month: string
  budgetCategories: string[]
  onSuccess: () => void
}

export function AiCategorizeReviewModal({
  open,
  onClose,
  month,
  budgetCategories,
  onSuccess,
}: AiCategorizeReviewModalProps) {
  const { t } = useTranslation('common')

  const {
    suggestions,
    categoryOptions,
    fetchMutation,
    applyMutation,
    sortedSuggestions,
    allSelected,
    selectedItems,
    createRules,
    setCreateRules,
    handleToggle,
    handleCategoryChange,
    handleSelectAll,
    handleDeselectAll,
    handleClose,
    getEditedCategory,
    checkBudgetMatch,
  } = useAiCategorizeReview(open, month, budgetCategories, onSuccess, onClose)

  return (
    <ResponsiveModal isOpen={open} onClose={handleClose} title={t('budget.aiCategorize.title')} size="lg">
      {fetchMutation.isPending && <ReviewLoadingSkeleton />}

      {fetchMutation.isError && (
        <div className="text-center py-8">
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{t('ai.analyzeError')}</p>
          <Button variant="outline" onClick={() => fetchMutation.mutate()}>
            {t('budget.aiCategorize.retry')}
          </Button>
        </div>
      )}

      {suggestions && suggestions.suggestions.length === 0 && (
        <div className="text-center py-8">
          <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('ai.noSuggestions')}</p>
        </div>
      )}

      {suggestions && suggestions.suggestions.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('budget.aiCategorize.summary', {
                shown: suggestions.suggestions.length,
                total: suggestions.total_other_count,
              })}
            </p>
            <button
              onClick={allSelected ? handleDeselectAll : handleSelectAll}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              {allSelected ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              {allSelected ? t('ai.deselectAll') : t('ai.selectAll')}
            </button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto -mx-1 px-1 pb-1">
            {sortedSuggestions.map((suggestion) => {
              const edited = getEditedCategory(suggestion.transaction_id, suggestion.suggested_category)
              return (
                <AiCategorizeReviewRow
                  key={suggestion.transaction_id}
                  suggestion={suggestion}
                  isSelected={selectedItems.has(suggestion.transaction_id)}
                  editedCategory={edited}
                  categories={categoryOptions}
                  categoryMatchesBudget={checkBudgetMatch(edited)}
                  onToggle={handleToggle}
                  onCategoryChange={handleCategoryChange}
                />
              )
            })}
          </div>

          <AiCategorizeReviewFooter
            createRules={createRules}
            onCreateRulesChange={setCreateRules}
            selectedCount={selectedItems.size}
            noneSelected={selectedItems.size === 0}
            isApplying={applyMutation.isPending}
            applyError={applyMutation.isError}
            onApply={() => applyMutation.mutate()}
            onClose={handleClose}
          />
        </>
      )}
    </ResponsiveModal>
  )
}
