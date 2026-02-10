import { useState, useEffect, useMemo, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Sparkles, CheckSquare, Square } from 'lucide-react'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/Button'
import { AiCategorizeReviewRow } from './ai-categorize-review-row'
import { AiCategorizeReviewFooter, ReviewLoadingSkeleton } from './ai-categorize-review-footer'
import {
  getBudgetCategorizationSuggestions,
  applyCategorizationSuggestions,
  type CategorizeSuggestionsResponse,
} from '@/services/ai-categorization-service'

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
  const { t, i18n } = useTranslation('common')
  const queryClient = useQueryClient()

  const [suggestions, setSuggestions] = useState<CategorizeSuggestionsResponse | null>(null)
  const [selectedItems, setSelectedItems] = useState<Map<number, string>>(new Map())
  const [editedCategories, setEditedCategories] = useState<Map<number, string>>(new Map())
  const [createRules, setCreateRules] = useState(true)

  const categoryOptions = useMemo(() => {
    const allCats = new Set(budgetCategories)
    suggestions?.new_categories_suggested.forEach((c) => allCats.add(c))
    return Array.from(allCats).map((c) => ({ value: c, label: c }))
  }, [budgetCategories, suggestions])

  const fetchMutation = useMutation({
    mutationFn: () => getBudgetCategorizationSuggestions(month, 50, i18n.language),
    onSuccess: (data) => {
      setSuggestions(data)
      const preSelected = new Map<number, string>()
      const cats = new Map<number, string>()
      data.suggestions.forEach((s) => {
        cats.set(s.transaction_id, s.suggested_category)
        if (s.confidence >= 0.7) preSelected.set(s.transaction_id, s.suggested_category)
      })
      setSelectedItems(preSelected)
      setEditedCategories(cats)
    },
  })

  const applyMutation = useMutation({
    mutationFn: () =>
      applyCategorizationSuggestions({
        approved: Array.from(selectedItems.entries()).map(([id, category]) => ({
          transaction_id: id,
          category,
        })),
        create_rules: createRules,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'tracking'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success(t('ai.applySuccess'))
      onSuccess()
      onClose()
    },
  })

  useEffect(() => {
    if (open) {
      setSuggestions(null)
      setSelectedItems(new Map())
      setEditedCategories(new Map())
      setCreateRules(true)
      fetchMutation.mutate()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback((id: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, editedCategories.get(id) || '')
      return next
    })
  }, [editedCategories])

  const handleCategoryChange = useCallback((id: number, category: string) => {
    setEditedCategories((prev) => new Map(prev).set(id, category))
    setSelectedItems((prev) => {
      if (!prev.has(id)) return prev
      return new Map(prev).set(id, category)
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (!suggestions) return
    const all = new Map<number, string>()
    suggestions.suggestions.forEach((s) =>
      all.set(s.transaction_id, editedCategories.get(s.transaction_id) || s.suggested_category)
    )
    setSelectedItems(all)
  }, [suggestions, editedCategories])

  const handleDeselectAll = useCallback(() => setSelectedItems(new Map()), [])

  const sortedSuggestions = useMemo(
    () => suggestions ? [...suggestions.suggestions].sort((a, b) => b.confidence - a.confidence) : [],
    [suggestions]
  )

  const allSelected = suggestions ? selectedItems.size === suggestions.suggestions.length : false
  const handleClose = useCallback(() => {
    if (!applyMutation.isPending) onClose()
  }, [applyMutation.isPending, onClose])

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
            {sortedSuggestions.map((suggestion) => (
              <AiCategorizeReviewRow
                key={suggestion.transaction_id}
                suggestion={suggestion}
                isSelected={selectedItems.has(suggestion.transaction_id)}
                editedCategory={editedCategories.get(suggestion.transaction_id) || suggestion.suggested_category}
                categories={categoryOptions}
                onToggle={handleToggle}
                onCategoryChange={handleCategoryChange}
              />
            ))}
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
