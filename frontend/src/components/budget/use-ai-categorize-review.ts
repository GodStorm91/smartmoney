import { useState, useEffect, useMemo, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  getBudgetCategorizationSuggestions,
  applyCategorizationSuggestions,
  type CategorizeSuggestionsResponse,
} from '@/services/ai-categorization-service'
import { useCategoryTree } from '@/hooks/useCategories'
import {
  getAllExpenseCategoryNames,
  buildCategoryHierarchy,
  categoryMatchesBudget,
} from '@/utils/category-utils'

export function useAiCategorizeReview(
  open: boolean,
  month: string,
  budgetCategories: string[],
  onSuccess: () => void,
  onClose: () => void
) {
  const { t, i18n } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: categoryTree } = useCategoryTree()

  const [suggestions, setSuggestions] = useState<CategorizeSuggestionsResponse | null>(null)
  const [selectedItems, setSelectedItems] = useState<Map<number, string>>(new Map())
  const [editedCategories, setEditedCategories] = useState<Map<number, string>>(new Map())
  const [createRules, setCreateRules] = useState(true)

  const hierarchy = useMemo(() => buildCategoryHierarchy(categoryTree), [categoryTree])
  const budgetCatSet = useMemo(
    () => new Set(budgetCategories.map((c) => c.toLowerCase())),
    [budgetCategories]
  )

  const categoryOptions = useMemo(() => {
    const allCats = new Set(budgetCategories)
    getAllExpenseCategoryNames(categoryTree).forEach((c) => allCats.add(c))
    suggestions?.new_categories_suggested.forEach((c) => allCats.add(c))

    return Array.from(allCats)
      .sort((a, b) => {
        const aIn = budgetCatSet.has(a.toLowerCase()) ? 0 : 1
        const bIn = budgetCatSet.has(b.toLowerCase()) ? 0 : 1
        if (aIn !== bIn) return aIn - bIn
        return a.localeCompare(b)
      })
      .map((c) => ({
        value: c,
        label: c,
        matchesBudget: categoryMatchesBudget(c, budgetCategories, hierarchy),
      }))
  }, [budgetCategories, budgetCatSet, suggestions, categoryTree, hierarchy])

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

  const getEditedCategory = (txId: number, fallback: string) =>
    editedCategories.get(txId) || fallback

  const checkBudgetMatch = (category: string) =>
    categoryMatchesBudget(category, budgetCategories, hierarchy)

  return {
    suggestions,
    selectedItems,
    editedCategories,
    createRules,
    setCreateRules,
    categoryOptions,
    fetchMutation,
    applyMutation,
    sortedSuggestions,
    allSelected,
    handleToggle,
    handleCategoryChange,
    handleSelectAll,
    handleDeselectAll,
    handleClose,
    getEditedCategory,
    checkBudgetMatch,
  }
}
