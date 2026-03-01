/**
 * SubscriptionSuggestions - Show detected recurring expense patterns for subscription tab
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Lightbulb, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import {
  fetchRecurringSuggestions,
  dismissRecurringSuggestion,
  type RecurringSuggestion,
} from '@/services/recurring-service'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'

interface SubscriptionSuggestionsProps {
  onCreateFromSuggestion: (suggestion: RecurringSuggestion) => void
}

function getConfidenceBadge(confidence: number): { label: string; cls: string; key: string } {
  if (confidence >= 0.8 || confidence >= 80) {
    return { label: 'High', key: 'subscriptions.high', cls: 'bg-income-100 text-income-600 dark:bg-income-900/20 dark:text-income-300' }
  }
  if (confidence >= 0.5 || confidence >= 50) {
    return { label: 'Medium', key: 'subscriptions.medium', cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' }
  }
  return { label: 'Low', key: 'subscriptions.low', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
}

export function SubscriptionSuggestions({ onCreateFromSuggestion }: SubscriptionSuggestionsProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const fmt = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  const { data: suggestions } = useQuery({
    queryKey: ['recurring-suggestions'],
    queryFn: () => fetchRecurringSuggestions(3),
    staleTime: 5 * 60 * 1000,
  })

  const dismissMutation = useMutation({
    mutationFn: dismissRecurringSuggestion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-suggestions'] }),
    onError: () => toast.error(t('recurring.dismissFailed', 'Failed to dismiss. Please try again.')),
  })

  // Filter to expense-only suggestions
  const expenseSuggestions = (suggestions || []).filter((s) => !s.is_income)

  if (expenseSuggestions.length === 0) return null

  return (
    <Card className="border-l-4 border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/20">
          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('subscriptions.suggestionsTitle', 'We detected these recurring charges')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('subscriptions.suggestionsSubtitle', 'Confirm to track them as subscriptions')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {expenseSuggestions.map((s, idx) => {
          const badge = getConfidenceBadge(s.confidence)
          return (
            <div
              key={s.hash}
              className={cn(
                'p-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-stagger-in',
                dismissMutation.isPending && dismissMutation.variables === s.hash && 'opacity-50'
              )}
              style={{ '--stagger-index': idx } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {s.description}
                    </span>
                    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', badge.cls)}>
                      {t(badge.key, badge.label)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-numbers text-expense-600 dark:text-expense-300">
                      -{fmt(s.amount)}
                    </span>
                    <span>{t(`recurring.${s.frequency}`, s.frequency)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="primary" onClick={() => onCreateFromSuggestion(s)} className="gap-1">
                    <Plus className="w-4 h-4" />
                    {t('button.create')}
                  </Button>
                  <button
                    onClick={() => dismissMutation.mutate(s.hash)}
                    disabled={dismissMutation.isPending}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={t('recurring.suggestions.dismiss', 'Dismiss')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
