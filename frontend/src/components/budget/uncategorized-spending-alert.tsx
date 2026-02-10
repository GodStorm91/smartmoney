import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { UncategorizedTransaction } from '@/types'

interface UncategorizedSpendingAlertProps {
  amount: number
  transactions?: UncategorizedTransaction[]
  month: string
  className?: string
}

export function UncategorizedSpendingAlert({
  amount,
  transactions,
  month,
  className
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

  const handleReview = () => {
    navigate({
      to: '/transactions',
      search: { month: month || undefined }
    })
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border',
        'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        className
      )}
      role="alert"
    >
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {t('budget.uncategorized.title')}
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
          {t('budget.uncategorized.description', {
            amount: formatCurrency(amount),
            count: txCount
          })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReview}
          className="mt-2 h-7 px-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/40"
        >
          {t('budget.uncategorized.reviewCta')}
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800/40 text-amber-500"
        aria-label={t('button.close')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
