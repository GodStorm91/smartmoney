import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Lightbulb, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePendingActions } from '@/hooks/use-pending-actions'
import { cn } from '@/utils/cn'
import type { PendingAction, ActionType } from '@/types/pending-action'

const NAVIGATION_ACTIONS: Partial<Record<ActionType, (params: Record<string, unknown>) => string>> = {
  review_uncategorized: () => '/analytics?tab=ai-tools',
  review_goal_catch_up: (params) => `/goals?edit=${params.goal_id || ''}`,
  monthly_report_nudge: () => '/analytics?tab=report',
}

interface BudgetInlineActionProps {
  action: PendingAction
}

export function BudgetInlineAction({ action }: BudgetInlineActionProps) {
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const { executeMutation, dismissMutation, undoMutation } = usePendingActions('budget_page')
  const [hidden, setHidden] = useState(false)

  // Localized copy from i18n keys + action params
  const titleKeyMap: Record<ActionType, string> = {
    review_uncategorized: 'actions.reviewUncategorized',
    copy_or_create_budget: 'actions.copyOrCreateBudget',
    adjust_budget_category: 'actions.adjustBudgetCategory',
    review_goal_catch_up: 'actions.reviewGoalCatchUp',
    monthly_report_nudge: 'actions.monthlyReportNudge',
  }
  const descKeyMap: Record<ActionType, string> = {
    review_uncategorized: 'actions.reviewUncategorizedDesc',
    copy_or_create_budget: 'actions.copyOrCreateBudgetDesc',
    adjust_budget_category: 'actions.adjustBudgetCategoryDesc',
    review_goal_catch_up: 'actions.reviewGoalCatchUpDesc',
    monthly_report_nudge: 'actions.monthlyReportNudgeDesc',
  }
  // Normalize params: map legacy snake_case keys to camelCase for i18n compatibility
  const normalizedParams = { ...action.params } as Record<string, string>
  if (normalizedParams.current_spent && !normalizedParams.spent) normalizedParams.spent = String(normalizedParams.current_spent)
  if (normalizedParams.goal_name && !normalizedParams.goalName) normalizedParams.goalName = String(normalizedParams.goal_name)
  if (normalizedParams.monthly_needed && !normalizedParams.monthlyNeeded) normalizedParams.monthlyNeeded = String(normalizedParams.monthly_needed)
  const reportYear = Number(action.params.reportYear)
  const reportMonth = Number(action.params.reportMonth)
  if (
    action.type === 'monthly_report_nudge' &&
    Number.isInteger(reportYear) &&
    Number.isInteger(reportMonth) &&
    reportMonth >= 1 &&
    reportMonth <= 12
  ) {
    normalizedParams.monthName = new Date(reportYear, reportMonth - 1, 1).toLocaleDateString(
      i18n.language,
      { month: 'long', year: 'numeric' },
    )
  }

  const localTitle = t(titleKeyMap[action.type], action.title, normalizedParams)
  const localDesc = t(descKeyMap[action.type], action.description || '', normalizedParams)

  const handleExecute = () => {
    const navAction = NAVIGATION_ACTIONS[action.type]
    executeMutation.mutate(action.id, {
      onSuccess: (result) => {
        if (navAction) {
          navigate({ to: navAction(action.params) })
          return
        }
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
          {localTitle}
        </p>
        {localDesc && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
            {localDesc}
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
