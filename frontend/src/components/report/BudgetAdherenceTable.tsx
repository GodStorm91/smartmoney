import { useTranslation } from 'react-i18next'
import type { BudgetAdherence } from '@/types'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'

interface BudgetAdherenceTableProps {
  data: BudgetAdherence
}

function statusToBadgeVariant(status: string) {
  switch (status) {
    case 'over_budget': return 'error' as const
    case 'threshold_80': return 'warning' as const
    case 'threshold_50': return 'info' as const
    default: return 'success' as const
  }
}

function statusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case 'over_budget': return t('report.overBudget')
    case 'threshold_80': return t('report.warning')
    case 'threshold_50': return t('report.caution')
    default: return t('report.onTrack')
  }
}

export function BudgetAdherenceTable({ data }: BudgetAdherenceTableProps) {
  const { t } = useTranslation('common')

  return (
    <div>
      {/* Overall progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-gray-600 dark:text-gray-400">
            {formatCurrency(Math.abs(data.total_spent))} / {formatCurrency(data.total_budget)}
          </span>
          <span className={cn(
            'font-medium',
            data.is_over_budget ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          )}>
            {data.percentage_used.toFixed(1)}%
          </span>
        </div>
        <Progress value={Math.min(data.percentage_used, 100)} />
      </div>

      {/* Category rows */}
      <div className="space-y-3">
        {data.category_status.map((cat) => (
          <div key={cat.category} className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                  {cat.category}
                </span>
                <Badge variant={statusToBadgeVariant(cat.status)} className="ml-2 text-[10px]">
                  {statusLabel(cat.status, t)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={Math.min(cat.percentage, 100)} className="flex-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
                  {formatCurrency(Math.abs(cat.spent))} / {formatCurrency(cat.budget_amount)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
