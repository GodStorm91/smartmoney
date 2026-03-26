import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ListChecks, Wallet, TrendingUp, Target } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { usePendingActions } from '@/hooks/use-pending-actions'
import { cn } from '@/utils/cn'
import type { PendingAction, ActionType } from '@/types/pending-action'

const iconMap: Record<ActionType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  review_uncategorized: ListChecks,
  copy_or_create_budget: Wallet,
  adjust_budget_category: TrendingUp,
  review_goal_catch_up: Target,
}

const ctaLabelMap: Record<ActionType, string> = {
  review_uncategorized: 'actions.apply',
  copy_or_create_budget: 'actions.apply',
  adjust_budget_category: 'actions.adjust',
  review_goal_catch_up: 'actions.apply',
}

interface DashboardActionCardProps {
  action: PendingAction
}

export function DashboardActionCard({ action }: DashboardActionCardProps) {
  const { t } = useTranslation('common')
  const { executeMutation, dismissMutation, undoMutation } = usePendingActions('dashboard')
  const [dismissed, setDismissed] = useState(false)

  const Icon = iconMap[action.type] || ListChecks
  const ctaKey = ctaLabelMap[action.type] || 'actions.apply'

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
    setDismissed(true)
    dismissMutation.mutate(action.id)
  }

  if (dismissed) return null

  return (
    <Card className={cn('transition-opacity duration-200', dismissed && 'opacity-0')}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30 shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
            {action.title}
          </p>
          {action.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              {action.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleExecute}
          disabled={executeMutation.isPending}
          className="px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold min-h-[44px] transition-colors disabled:opacity-50"
        >
          {executeMutation.isPending ? '...' : t(ctaKey, 'Apply')}
        </button>
        <button
          onClick={handleDismiss}
          disabled={dismissMutation.isPending}
          className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 min-h-[44px] transition-colors"
        >
          {t('actions.notNow', 'Not now')}
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 italic">
        {t('actions.disclaimer', 'Based on your transaction history. Not financial advice.')}
      </p>
    </Card>
  )
}
