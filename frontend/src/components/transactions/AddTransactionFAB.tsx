import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AddTransactionFABProps {
  onClick: () => void
}

export function AddTransactionFAB({ onClick }: AddTransactionFABProps) {
  const { t } = useTranslation('common')

  return createPortal(
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-28 right-4 sm:bottom-6 sm:right-6 z-50',
        'w-14 h-14 rounded-full',
        'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
        'text-white shadow-lg',
        'flex items-center justify-center',
        'active:scale-95 transition-all',
        'md:hidden'
      )}
      aria-label={t('transaction.addTransaction', 'Add Transaction')}
    >
      <Plus size={28} />
    </button>,
    document.body
  )
}
