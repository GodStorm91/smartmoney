import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatDate'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { fetchDuplicates, resolveDuplicate, type DuplicateTransaction } from '@/services/transaction-service'

interface DuplicateReviewModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TransactionColumnProps {
  tx: DuplicateTransaction
  highlighted: boolean
  label: string
}

function TransactionColumn({ tx, highlighted, label }: TransactionColumnProps) {
  const { t } = useTranslation('common')
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()
  const currency = tx.currency || 'JPY'

  return (
    <div
      className={cn(
        'flex-1 rounded-lg p-3 space-y-2 border',
        highlighted
          ? 'bg-warning-50 dark:bg-warning-900/20 border-warning-300 dark:border-warning-700'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
        {label}
      </p>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(tx.date)}</p>

        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={tx.description}>
          {tx.description}
        </p>

        <p
          className={cn(
            'text-sm font-bold font-numbers',
            tx.type === 'income'
              ? 'text-income-600 dark:text-income-400'
              : 'text-expense-600 dark:text-expense-400'
          )}
        >
          {formatCurrencyPrivacy(tx.amount, currency, rates, true, isPrivacyMode)}
        </p>

        <div className="flex items-center gap-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
            {tx.category}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">{t('duplicates.source')}:</span> {tx.source}
        </p>
      </div>
    </div>
  )
}

function SimilarityBadge({ similarity }: { similarity: number }) {
  const percent = Math.round(similarity * 100)
  const isHigh = percent >= 90

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
        isHigh
          ? 'bg-expense-100 dark:bg-expense-900/30 text-expense-700 dark:text-expense-300'
          : 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300'
      )}
    >
      {percent}%
    </span>
  )
}

export function DuplicateReviewModal({ isOpen, onClose }: DuplicateReviewModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['transaction-duplicates'],
    queryFn: () => fetchDuplicates(0.75, 3),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  })

  const resolveMutation = useMutation({
    mutationFn: ({
      action,
      keepId,
      removeId,
    }: {
      action: 'merge' | 'dismiss'
      keepId: number
      removeId: number
    }) => resolveDuplicate(action, keepId, removeId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transaction-duplicates'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      if (variables.action === 'merge') {
        toast.success(t('duplicates.merged'))
      } else {
        toast.success(t('duplicates.dismissed'))
      }
    },
    onError: () => {
      toast.error(t('errors.genericError', 'An error occurred'))
    },
  })

  const duplicates = data?.duplicates ?? []
  const count = data?.count ?? 0

  const title = count > 0
    ? `${t('duplicates.title')} (${count})`
    : t('duplicates.title')

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      {isLoading && (
        <div className="py-12 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      )}

      {!isLoading && duplicates.length === 0 && (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-income-100 dark:bg-income-900/30 flex items-center justify-center mx-auto mb-3">
            <Copy className="w-6 h-6 text-income-600 dark:text-income-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('duplicates.none')}
          </p>
        </div>
      )}

      {!isLoading && duplicates.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('duplicates.found', { count: duplicates.length })}
          </p>

          {duplicates.map((pair, index) => {
            const tx1 = pair.transaction_1
            const tx2 = pair.transaction_2
            const isPending = resolveMutation.isPending

            // Highlight the side with a different field vs the other
            const dateDiffers = tx1.date !== tx2.date
            const sourceDiffers = tx1.source !== tx2.source
            const highlighted1 = dateDiffers || sourceDiffers
            const highlighted2 = highlighted1

            return (
              <div
                key={`${tx1.id}-${tx2.id}`}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
              >
                {/* Pair header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <SimilarityBadge similarity={pair.similarity} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('duplicates.similarity', { percent: Math.round(pair.similarity * 100) })}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('duplicates.daysApart', { days: pair.date_diff_days })}
                  </span>
                  <span className="ml-auto text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                    #{index + 1}
                  </span>
                </div>

                {/* Side-by-side comparison */}
                <div className="p-3 flex gap-2">
                  <TransactionColumn
                    tx={tx1}
                    highlighted={highlighted1 && sourceDiffers}
                    label="A"
                  />
                  <TransactionColumn
                    tx={tx2}
                    highlighted={highlighted2 && sourceDiffers}
                    label="B"
                  />
                </div>

                {/* Actions */}
                <div className="px-3 pb-3 flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      resolveMutation.mutate({ action: 'merge', keepId: tx1.id, removeId: tx2.id })
                    }
                    className="flex-1 text-xs"
                  >
                    {t('duplicates.keepLeft')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      resolveMutation.mutate({ action: 'merge', keepId: tx2.id, removeId: tx1.id })
                    }
                    className="flex-1 text-xs"
                  >
                    {t('duplicates.keepRight')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      resolveMutation.mutate({ action: 'dismiss', keepId: tx1.id, removeId: tx2.id })
                    }
                    className="flex-1 text-xs"
                  >
                    {t('duplicates.keepBoth')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ResponsiveModal>
  )
}
