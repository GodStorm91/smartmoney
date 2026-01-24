import { useTranslation } from 'react-i18next'
import { CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'

interface BudgetConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  monthlyIncome: number
  totalAllocated: number
  savingsTarget: number
  categoryCount: number
  isLoading?: boolean
}

export function BudgetConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  monthlyIncome,
  totalAllocated,
  savingsTarget,
  categoryCount,
  isLoading = false
}: BudgetConfirmDialogProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  if (!isOpen) return null

  const unallocated = monthlyIncome - totalAllocated - savingsTarget
  const isOverAllocated = unallocated < 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog - Bottom sheet on mobile, centered on desktop */}
      <div
        className={cn(
          'fixed z-50 bg-white dark:bg-gray-800 shadow-xl',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 rounded-t-2xl',
          // Desktop: centered modal
          'lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2',
          'lg:rounded-xl lg:max-w-md lg:w-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Handle bar for mobile */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('budget.confirmDialog.title')}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={t('button.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">{t('budget.monthlyIncome')}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(monthlyIncome)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">{t('budget.totalAllocated')}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(totalAllocated)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">{t('budget.savingsTarget')}</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(savingsTarget)}
              </span>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-700" />

            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {isOverAllocated ? t('budget.overAllocated') : t('budget.confirmDialog.unallocated')}
              </span>
              <span className={cn(
                'font-semibold',
                isOverAllocated ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
              )}>
                {isOverAllocated ? `-${formatCurrency(Math.abs(unallocated))}` : formatCurrency(unallocated)}
              </span>
            </div>
          </div>

          {/* Category count */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>{t('budget.confirmDialog.categoriesConfigured', { count: categoryCount })}</span>
          </div>

          {/* Warning if over-allocated */}
          {isOverAllocated && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-400">
              {t('budget.confirmDialog.overAllocatedWarning')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isLoading}
          >
            {t('button.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? t('budget.saving') : t('budget.save')}
          </Button>
        </div>
      </div>
    </>
  )
}
