import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'

interface BulkDeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedCount: number
  isDeleting: boolean
}

export function BulkDeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isDeleting
}: BulkDeleteConfirmDialogProps) {
  const { t } = useTranslation('common')

  if (!isOpen) return null

  const dialogContent = (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4"

    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-[calc(100%-2rem)] max-w-md shadow-xl">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('transactions.bulkDeleteTitle', 'Delete Transactions')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t('transactions.bulkDeleteConfirm', 'Are you sure you want to delete {{count}} transactions? This cannot be undone.', { count: selectedCount })}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('button.cancel', 'Cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting} className="flex-1">
            {isDeleting ? t('button.deleting', 'Deleting...') : t('button.delete', 'Delete')}
          </Button>
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(dialogContent, document.body)
  }
  return null
}
