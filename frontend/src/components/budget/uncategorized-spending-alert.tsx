import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, X, ArrowRight, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { UncategorizedTransaction } from '@/types'

export type AiCategorizationState = 'idle' | 'loading' | 'success'

interface UncategorizedSpendingAlertProps {
  amount: number
  transactions?: UncategorizedTransaction[]
  month: string
  className?: string
  aiState?: AiCategorizationState
  onAiCategorize?: () => void
}

export function UncategorizedSpendingAlert({
  amount,
  transactions,
  month,
  className,
  aiState = 'idle',
  onAiCategorize
}: UncategorizedSpendingAlertProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const [dismissed, setDismissed] = useState(false)

  const formatCurrency = (v: number) =>
    formatCurrencyPrivacy(v, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  if (dismissed || amount <= 0) return null

  const txCount = transactions?.length || 0
  const isLoading = aiState === 'loading'
  const isSuccess = aiState === 'success'

  const handleReview = () => {
    navigate({
      to: '/transactions',
      search: { month: month || undefined }
    })
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ease-out',
        isLoading && 'animate-shimmer',
        isSuccess
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        className
      )}
      role="alert"
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5 animate-success-pop" aria-hidden="true" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium transition-colors duration-300',
          isSuccess
            ? 'text-green-700 dark:text-green-300'
            : 'text-amber-700 dark:text-amber-300'
        )}>
          {isSuccess
            ? t('budget.uncategorized.aiSuccess', 'Categories suggested!')
            : t('budget.uncategorized.title')}
        </p>
        <p className={cn(
          'text-xs mt-0.5 transition-colors duration-300',
          isSuccess
            ? 'text-green-600 dark:text-green-400'
            : 'text-amber-600 dark:text-amber-400'
        )}>
          {isLoading
            ? t('budget.uncategorized.aiProcessing', 'Analyzing transactions...')
            : isSuccess
              ? t('budget.uncategorized.aiSuccessDescription', 'Review and apply the suggested categories below')
              : t('budget.uncategorized.description', {
                  amount: formatCurrency(amount),
                  count: txCount
                })}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {onAiCategorize && !isSuccess && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAiCategorize}
              disabled={isLoading}
              className={cn(
                'h-7 px-2.5 text-xs font-medium',
                'bg-purple-50 dark:bg-purple-900/30',
                'text-purple-700 dark:text-purple-300',
                'hover:bg-purple-100 dark:hover:bg-purple-800/40',
                'border border-purple-200 dark:border-purple-700',
                'disabled:opacity-60'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1" />
              )}
              {isLoading
                ? t('budget.uncategorized.aiProcessingBtn', 'Analyzing...')
                : t('budget.uncategorized.aiCategorizeCta', 'AI Categorize')}
            </Button>
          )}
          {!isLoading && !isSuccess && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReview}
              className="h-7 px-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/40"
            >
              {t('budget.uncategorized.reviewCta')}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className={cn(
          'p-1.5 rounded-full transition-colors duration-200',
          isSuccess
            ? 'hover:bg-green-100 dark:hover:bg-green-800/40 text-green-500'
            : 'hover:bg-amber-100 dark:hover:bg-amber-800/40 text-amber-500'
        )}
        aria-label={t('button.close')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

/** Confidence badge color mapping */
export function getConfidenceBadgeVariant(confidence: number): 'success' | 'warning' | 'error' {
  if (confidence >= 80) return 'success'
  if (confidence >= 60) return 'warning'
  return 'error'
}
