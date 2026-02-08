import { useTranslation } from 'react-i18next'
import type { GoalProgressItem } from '@/types'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/formatCurrency'

interface GoalProgressCardProps {
  goal: GoalProgressItem
}

function statusVariant(status: string) {
  switch (status) {
    case 'ahead': return 'success' as const
    case 'on_track': return 'info' as const
    default: return 'warning' as const
  }
}

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const { t } = useTranslation('common')

  const statusLabel = {
    ahead: t('report.ahead'),
    on_track: t('report.onTrack'),
    behind: t('report.behind'),
  }[goal.status] || goal.status

  return (
    <div className="p-4 border rounded-lg border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {t('report.goalYears', { years: goal.years })}
        </h3>
        <Badge variant={statusVariant(goal.status)}>{statusLabel}</Badge>
      </div>
      <Progress value={Math.min(goal.progress_percentage, 100)} className="mb-2" />
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          {formatCurrency(goal.total_saved)} / {formatCurrency(goal.target_amount)}
        </span>
        <span>{goal.progress_percentage.toFixed(1)}%</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
        {t('report.neededPerMonth', { amount: formatCurrency(goal.needed_per_month) })}
      </p>
    </div>
  )
}
