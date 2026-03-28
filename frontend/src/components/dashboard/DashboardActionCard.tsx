import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { ListChecks, Wallet, TrendingUp, Target, FileText, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { usePendingActions } from '@/hooks/use-pending-actions'
import { fetchAISummary } from '@/services/report-service'
import { cn } from '@/utils/cn'
import type { PendingAction, ActionType } from '@/types/pending-action'

const iconMap: Record<ActionType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  review_uncategorized: ListChecks,
  copy_or_create_budget: Wallet,
  adjust_budget_category: TrendingUp,
  review_goal_catch_up: Target,
  monthly_report_nudge: FileText,
}

const ctaLabelMap: Record<ActionType, string> = {
  review_uncategorized: 'actions.apply',
  copy_or_create_budget: 'actions.apply',
  adjust_budget_category: 'actions.adjust',
  review_goal_catch_up: 'actions.apply',
  monthly_report_nudge: 'actions.apply',
}

interface DashboardActionCardProps {
  action: PendingAction
}

// Navigation-only action types that should route the user instead of just marking executed
const NAVIGATION_ACTIONS: Partial<Record<ActionType, (params: Record<string, unknown>) => string>> = {
  review_uncategorized: () => '/analytics?tab=ai-tools',
  review_goal_catch_up: (params) => `/goals?edit=${params.goal_id || ''}`,
  monthly_report_nudge: () => '/analytics?tab=report',
}

export function DashboardActionCard({ action }: DashboardActionCardProps) {
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const { executeMutation, dismissMutation, undoMutation } = usePendingActions('dashboard')
  const [dismissed, setDismissed] = useState(false)
  const [resolved, setResolved] = useState(false)

  const reportYear = Number(action.params.reportYear)
  const reportMonth = Number(action.params.reportMonth)
  const hasReportPeriod =
    Number.isInteger(reportYear) &&
    Number.isInteger(reportMonth) &&
    reportMonth >= 1 &&
    reportMonth <= 12

  const { data: reportSummary } = useQuery({
    queryKey: ['monthly-report-action-summary', reportYear, reportMonth, i18n.language],
    queryFn: () => fetchAISummary(reportYear, reportMonth, i18n.language),
    enabled: action.type === 'monthly_report_nudge' && hasReportPeriod,
    retry: false,
    staleTime: Infinity,
  })

  const Icon = iconMap[action.type] || ListChecks
  const ctaKey = ctaLabelMap[action.type] || 'actions.apply'

  // Localized title/description from i18n keys + action params (Finding 5 fix)
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
  if (action.type === 'monthly_report_nudge' && hasReportPeriod) {
    normalizedParams.monthName = new Date(reportYear, reportMonth - 1, 1).toLocaleDateString(
      i18n.language,
      { month: 'long', year: 'numeric' },
    )
  }

  const localTitle = t(titleKeyMap[action.type], action.title, normalizedParams)
  const localDesc = action.type === 'monthly_report_nudge' && reportSummary?.win
    ? reportSummary.win
    : t(descKeyMap[action.type], action.description || '', normalizedParams)

  const handleExecute = () => {
    const navAction = NAVIGATION_ACTIONS[action.type]
    executeMutation.mutate(action.id, {
      onSuccess: (result) => {
        // Navigation actions: route user to the relevant flow after marking executed
        if (navAction) {
          const path = navAction(action.params)
          navigate({ to: path })
          return
        }
        // Show resolve animation before hiding
        setResolved(true)
        setTimeout(() => setDismissed(true), 600)

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
    <Card className={cn(
      'transition-all duration-300 motion-reduce:transition-none',
      resolved && 'bg-income-50/50 dark:bg-income-900/10 scale-[0.98] opacity-80',
      dismissed && 'opacity-0 -translate-y-2 h-0 p-0 overflow-hidden'
    )}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30 shrink-0 mt-0.5">
          {resolved ? (
            <Check className="w-4 h-4 text-income-600 dark:text-income-300 animate-in zoom-in-50 duration-200" />
          ) : (
            <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
            {localTitle}
          </p>
          {localDesc && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              {localDesc}
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
