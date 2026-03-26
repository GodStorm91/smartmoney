import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lightbulb, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePendingActions } from '@/hooks/use-pending-actions'
import { cn } from '@/utils/cn'
import type { PendingAction } from '@/types/pending-action'

interface BudgetInlineActionProps {
  action: PendingAction
}

export function BudgetInlineAction({ action }: BudgetInlineActionProps) {
  const { t } = useTranslation('common')
  const { executeMutation, dismissMutation, undoMutation } = usePendingActions('budget_page')
  const [hidden, setHidden] = useState(false)

  const handleExecute = () => {
    executeMutation.mutate(action.id, {
      onSuccess: (result) => {
        toast.success(t('actions.applied', 'Action applied'), {
          duration: 10000,
          action: result.undo_available
            ? {
                label: t('actions.undo', 'Undo'),
                onClick: () => undoMutation.mutate(action.id),
              }
            : undefined,
        })
      },
    })
  }

  const handleDismiss = () => {
    setHidden(true)
    dismissMutation.mutate(action.id)
  }

  if (hidden) return null

  return (
    <div
      className={cn(
        'border-l-4 border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 rounded-r-lg p-3 flex items-start gap-3',
        'transition-all duration-200',
        hidden && 'opacity-0 h-0 p-0 overflow-hidden'
      )}
    >
      <Lightbulb className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
          {action.title}
        </p>
        {action.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
            {action.description}
          </p>
        )}
        <button
          onClick={handleExecute}
          disabled={executeMutation.isPending}
          className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-flex items-center cursor-pointer min-h-[44px] disabled:opacity-50"
        >
          {executeMutation.isPending ? '...' : t('actions.apply', 'Apply')}
        </button>
      </div>

      <button
        onClick={handleDismiss}
        disabled={dismissMutation.isPending}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
        aria-label={t('actions.dismissed', 'Dismissed')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
