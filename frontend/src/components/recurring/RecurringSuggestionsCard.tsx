/**
 * RecurringSuggestionsCard - Display detected recurring patterns as suggestions
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Lightbulb, X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  fetchRecurringSuggestions,
  dismissRecurringSuggestion,
  type RecurringSuggestion,
} from '@/services/recurring-service'

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  VND: '₫',
}

interface RecurringSuggestionsCardProps {
  onCreateFromSuggestion: (suggestion: RecurringSuggestion) => void
}

export function RecurringSuggestionsCard({
  onCreateFromSuggestion,
}: RecurringSuggestionsCardProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(true)
  const [dismissingHash, setDismissingHash] = useState<string | null>(null)

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['recurring-suggestions'],
    queryFn: () => fetchRecurringSuggestions(3),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const dismissMutation = useMutation({
    mutationFn: dismissRecurringSuggestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-suggestions'] })
      setDismissingHash(null)
    },
    onError: () => {
      setDismissingHash(null)
    },
  })

  const handleDismiss = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissingHash(hash)
    dismissMutation.mutate(hash)
  }

  const formatFrequency = (suggestion: RecurringSuggestion): string => {
    switch (suggestion.frequency) {
      case 'weekly':
        return t('recurring.weekly')
      case 'monthly':
        return t('recurring.monthly')
      case 'custom':
        return t('recurring.everyNDays', { n: suggestion.interval_days ?? 14 })
      default:
        return suggestion.frequency
    }
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  // Don't show if loading or no suggestions
  if (isLoading || !suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <Card className="mb-6 border-l-4 border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('recurring.suggestions.title', 'Detected Patterns')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('recurring.suggestions.subtitle', '{{count}} potential recurring transactions found', {
                count: suggestions.length,
              })}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Suggestions List */}
      {isExpanded && (
        <div className="mt-4 space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.hash}
              className={cn(
                'p-4 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                'transition-opacity',
                dismissingHash === suggestion.hash && 'opacity-50'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {suggestion.description}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        getConfidenceColor(suggestion.confidence)
                      )}
                    >
                      {suggestion.confidence}%
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className={cn(
                      'font-numbers',
                      suggestion.is_income ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                      {suggestion.is_income ? '+' : '-'}
                      {CURRENCY_SYMBOLS['JPY']}{suggestion.amount.toLocaleString()}
                    </span>
                    <span>{suggestion.category}</span>
                    <span>{formatFrequency(suggestion)}</span>
                    <span className="text-xs">
                      {t('recurring.suggestions.occurrences', '{{count}} times', {
                        count: suggestion.occurrences,
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onCreateFromSuggestion(suggestion)}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {t('button.create')}
                  </Button>
                  <button
                    onClick={(e) => handleDismiss(suggestion.hash, e)}
                    disabled={dismissingHash === suggestion.hash}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={t('recurring.suggestions.dismiss', 'Dismiss')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
