import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  Edit,
  Trash2,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrencyWithJPY } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { Transaction } from '@/types'

interface TransactionDetailModalProps {
  transaction: Transaction | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}

export function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete
}: TransactionDetailModalProps) {
  const { t } = useTranslation('common')
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Exchange rates for conversion
  const rates = exchangeRates?.rates || {}

  if (!isOpen || !transaction) return null

  // Get the transaction's native currency
  const txCurrency = transaction.currency || 'JPY'

  // Format amount with original currency and JPY equivalent
  const displayAmount = formatCurrencyWithJPY(
    Math.abs(transaction.amount),
    txCurrency,
    rates,
    true, // amount is already in native currency (stored as-is)
    isPrivacyMode
  )

  const handleDelete = () => {
    if (onDelete) {
      onDelete(transaction)
    }
    onClose()
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal - Centered in current viewport */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[80dvh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('transactions.transactionDetails')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Amount */}
            <div className="text-center py-2">
              <p className={cn(
                'text-3xl font-bold font-numbers',
                transaction.type === 'income'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-900 dark:text-gray-100'
              )}>
                {transaction.type === 'income' ? '+' : '-'}
                {isPrivacyMode ? '****' : displayAmount}
              </p>
              <p className={cn(
                'text-sm font-medium mt-1',
                transaction.type === 'income'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}>
                {transaction.type === 'income' ? t('transactions.income') : t('transactions.expense')}
              </p>
            </div>

            {/* Details List */}
            <div className="space-y-3">
              {/* Description */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('transactions.description')}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {transaction.description || '-'}
                  </p>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Tag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('transactions.category')}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {transaction.category}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('transactions.date')}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(transaction.date, 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Source */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('transactions.source')}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {transaction.source || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Receipt Image */}
            {transaction.receipt_url && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t('transactions.receipt')}
                </p>
                <div className="relative">
                  <img
                    src={transaction.receipt_url}
                    alt="Receipt"
                    className="w-full h-48 object-cover rounded-lg bg-gray-100 dark:bg-gray-800"
                  />
                  <a
                    href={transaction.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {showDeleteConfirm ? (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 sticky bottom-0 bg-white dark:bg-gray-900">
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                {t('transactions.deleteConfirm')}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleDelete}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-900">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onEdit?.(transaction)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )

  // Use createPortal to render at document body level for proper viewport positioning
  return createPortal(modalContent, document.body)
}
