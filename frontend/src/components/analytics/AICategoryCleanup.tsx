import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import {
  getCategorizationSuggestions,
  applyCategorizationSuggestions,
  type CategorySuggestion,
  type CategorizeSuggestionsResponse,
} from '@/services/ai-categorization-service'

const BATCH_SIZE = 50
const CREDITS_PER_BATCH = 0.5

interface SuggestionItemProps {
  suggestion: CategorySuggestion
  isSelected: boolean
  onToggle: (id: number, category: string) => void
}

function SuggestionItem({ suggestion, isSelected, onToggle }: SuggestionItemProps) {
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { t } = useTranslation('common')

  const confidenceColor =
    suggestion.confidence >= 0.8
      ? 'text-green-600 dark:text-green-400'
      : suggestion.confidence >= 0.6
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <div
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={() => onToggle(suggestion.transaction_id, suggestion.suggested_category)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {suggestion.description}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatCurrency(suggestion.amount, currency, exchangeRates?.rates || {}, false)}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-2">
            {suggestion.is_new_category && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                {t('ai.newCategory')}
              </span>
            )}
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {suggestion.suggested_category}
            </span>
          </div>
          <p className={`text-xs mt-1 ${confidenceColor}`}>
            {Math.round(suggestion.confidence * 100)}% {t('ai.confidence')}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
        {suggestion.reason}
      </p>
    </div>
  )
}

interface ProgressState {
  isRunning: boolean
  processed: number
  total: number
  currentBatch: number
  totalBatches: number
}

export function AICategoryCleanup() {
  const { t, i18n } = useTranslation('common')
  const queryClient = useQueryClient()
  const [suggestions, setSuggestions] = useState<CategorizeSuggestionsResponse | null>(null)
  const [selectedItems, setSelectedItems] = useState<Map<number, string>>(new Map())
  const [createRules, setCreateRules] = useState(true)
  const [totalOtherCount, setTotalOtherCount] = useState(0)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const cancelRef = useRef(false)

  const analyzeMutation = useMutation({
    mutationFn: () => getCategorizationSuggestions(BATCH_SIZE, i18n.language),
    onSuccess: (data) => {
      setSuggestions(data)
      setTotalOtherCount(data.total_other_count)
      // Pre-select high confidence suggestions
      const preSelected = new Map<number, string>()
      data.suggestions.forEach((s) => {
        if (s.confidence >= 0.7) {
          preSelected.set(s.transaction_id, s.suggested_category)
        }
      })
      setSelectedItems(preSelected)
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
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      // Auto-continue to next batch
      const remaining = totalOtherCount - selectedItems.size
      if (remaining > 0) {
        setTotalOtherCount(remaining)
        setSuggestions(null)
        setSelectedItems(new Map())
        // Trigger next analysis
        setTimeout(() => analyzeMutation.mutate(), 500)
      } else {
        setSuggestions(null)
        setSelectedItems(new Map())
        setTotalOtherCount(0)
      }
    },
  })

  const runAnalyzeAll = useCallback(async () => {
    cancelRef.current = false
    const totalBatches = Math.ceil(totalOtherCount / BATCH_SIZE)
    let processed = 0

    setProgress({
      isRunning: true,
      processed: 0,
      total: totalOtherCount,
      currentBatch: 0,
      totalBatches,
    })

    for (let batch = 0; batch < totalBatches; batch++) {
      if (cancelRef.current) break

      setProgress((prev) => prev ? { ...prev, currentBatch: batch + 1 } : null)

      try {
        // Get suggestions
        const data = await getCategorizationSuggestions(BATCH_SIZE, i18n.language)

        if (data.suggestions.length === 0) break
        if (cancelRef.current) break

        // Auto-select high confidence (>=70%)
        const toApply = data.suggestions
          .filter((s) => s.confidence >= 0.7)
          .map((s) => ({ transaction_id: s.transaction_id, category: s.suggested_category }))

        if (toApply.length > 0) {
          await applyCategorizationSuggestions({
            approved: toApply,
            create_rules: createRules,
          })
          processed += toApply.length
        }

        setProgress((prev) => prev ? { ...prev, processed } : null)

        // Small delay between batches
        await new Promise((r) => setTimeout(r, 300))
      } catch {
        break
      }
    }

    // Cleanup
    setProgress(null)
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    setSuggestions(null)
    setTotalOtherCount(0)
  }, [totalOtherCount, i18n.language, createRules, queryClient])

  const handleCancel = () => {
    cancelRef.current = true
    setProgress(null)
  }

  const handleToggle = (id: number, category: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.set(id, category)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (!suggestions) return
    const all = new Map<number, string>()
    suggestions.suggestions.forEach((s) => {
      all.set(s.transaction_id, s.suggested_category)
    })
    setSelectedItems(all)
  }

  const handleDeselectAll = () => {
    setSelectedItems(new Map())
  }

  // Progress bar state
  if (progress?.isRunning) {
    const percent = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
    return (
      <Card>
        <div className="py-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-4">
            {t('ai.processingAll')}
          </h3>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
            <div
              className="bg-primary-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            {t('ai.processProgress', {
              processed: progress.processed,
              total: progress.total,
              batch: progress.currentBatch,
              totalBatches: progress.totalBatches,
            })}
          </p>
          <div className="text-center">
            <Button variant="outline" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  // Initial state - show analyze buttons
  if (!suggestions) {
    const remaining = totalOtherCount
    const showAnalyzeAll = remaining > 250 // remaining / 50 > 5
    const estimatedCredits = Math.ceil(remaining / BATCH_SIZE) * CREDITS_PER_BATCH

    return (
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('ai.categoryCleanup')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('ai.categoryCleanupDesc')}
            </p>
            {remaining > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {t('ai.remainingOther', { count: remaining })}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
            >
              {analyzeMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('ai.analyzing')}
                </>
              ) : (
                t('ai.analyzeOther')
              )}
            </Button>
            {showAnalyzeAll && (
              <Button
                variant="outline"
                onClick={runAnalyzeAll}
                disabled={analyzeMutation.isPending}
                title={t('ai.analyzeAllCredits', { credits: estimatedCredits.toFixed(1) })}
              >
                {t('ai.analyzeAll', { count: remaining })}
              </Button>
            )}
          </div>
        </div>
        {analyzeMutation.isError && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {t('ai.analyzeError')}
          </div>
        )}
      </Card>
    )
  }

  // No suggestions found
  if (suggestions.suggestions.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">{t('ai.noSuggestions')}</p>
          <Button variant="outline" onClick={() => setSuggestions(null)} className="mt-4">
            {t('common.close')}
          </Button>
        </div>
      </Card>
    )
  }

  // Calculate remaining after this batch
  const remaining = totalOtherCount - suggestions.suggestions.length
  const showAnalyzeAll = remaining > 250

  // Show suggestions
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('ai.categoryCleanup')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('ai.foundSuggestions', { count: suggestions.suggestions.length, total: totalOtherCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {t('ai.selectAll')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            {t('ai.deselectAll')}
          </Button>
        </div>
      </div>

      {suggestions.new_categories_suggested.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('ai.newCategoriesSuggested')}: {suggestions.new_categories_suggested.join(', ')}
          </p>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {suggestions.suggestions.map((suggestion) => (
          <SuggestionItem
            key={suggestion.transaction_id}
            suggestion={suggestion}
            isSelected={selectedItems.has(suggestion.transaction_id)}
            onToggle={handleToggle}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={createRules}
              onChange={(e) => setCreateRules(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            {t('ai.createRulesAuto')}
          </label>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setSuggestions(null)}>
              {t('common.cancel')}
            </Button>
            {showAnalyzeAll && (
              <Button
                variant="outline"
                onClick={runAnalyzeAll}
                disabled={applyMutation.isPending}
              >
                {t('ai.analyzeAll', { count: remaining })}
              </Button>
            )}
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={selectedItems.size === 0 || applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('ai.applying')}
                </>
              ) : (
                t('ai.applySelected', { count: selectedItems.size })
              )}
            </Button>
          </div>
        </div>
        {applyMutation.isError && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            {t('ai.applyError')}
          </div>
        )}
      </div>
    </Card>
  )
}
