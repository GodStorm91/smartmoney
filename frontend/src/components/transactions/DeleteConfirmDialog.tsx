import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { Transaction } from '@/types'
import { formatCurrencySignedPrivacy } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  transaction: Transaction | null
  isDeleting?: boolean
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()

  if (!isOpen || !transaction) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[calc(100%-2rem)] max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {t('transaction.deleteConfirm', '取引を削除しますか？')}
        </h2>

        {/* Transaction Details */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 space-y-2">
          <p className="font-medium text-gray-900 dark:text-gray-100">{transaction.description}</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">{formatDate(transaction.date)}</span>
            <span
              className={`font-bold font-numbers ${
                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrencySignedPrivacy(
                transaction.amount,
                transaction.type,
                currency,
                rates,
                false,
                isPrivacyMode
              )}
            </span>
          </div>
          <div className="flex gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span>{transaction.category}</span>
            <span>•</span>
            <span>{transaction.source}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('transaction.deleteWarning', 'この操作は取り消せません。本当に削除しますか？')}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
          >
            {t('button.cancel', 'キャンセル')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? '削除中...' : t('button.delete', '削除')}
          </Button>
        </div>
      </div>
    </div>
  )
}
