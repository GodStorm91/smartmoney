import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface BudgetMoneyFlowProps {
  income: number
  allocated: number
  savings: number
  formatCurrency: (amount: number) => string
  className?: string
}

export function BudgetMoneyFlow({
  income,
  allocated,
  savings,
  formatCurrency,
  className
}: BudgetMoneyFlowProps) {
  const { t } = useTranslation('common')

  const allocatedPct = income > 0 ? Math.min(100, (allocated / income) * 100) : 0
  const savingsPct = income > 0 ? Math.min(100, (savings / income) * 100) : 0
  const unallocatedPct = Math.max(0, 100 - allocatedPct - savingsPct)

  return (
    <div className={cn('rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4', className)}>
      {/* Flow labels */}
      <div className="flex items-center justify-between mb-3">
        <FlowNode
          label={t('budget.flow.income')}
          value={formatCurrency(income)}
          color="text-green-600 dark:text-green-400"
        />
        <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mx-1" />
        <FlowNode
          label={t('budget.flow.allocated')}
          value={formatCurrency(allocated)}
          color="text-blue-600 dark:text-blue-400"
        />
        <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mx-1" />
        <FlowNode
          label={t('budget.flow.saved')}
          value={formatCurrency(savings)}
          color="text-pink-600 dark:text-pink-400"
        />
      </div>

      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700">
        {allocatedPct > 0 && (
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${allocatedPct}%` }}
            title={`${t('budget.flow.allocated')}: ${Math.round(allocatedPct)}%`}
          />
        )}
        {savingsPct > 0 && (
          <div
            className="bg-pink-500 transition-all duration-500"
            style={{ width: `${savingsPct}%` }}
            title={`${t('budget.flow.saved')}: ${Math.round(savingsPct)}%`}
          />
        )}
        {unallocatedPct > 0 && (
          <div
            className="bg-gray-300 dark:bg-gray-600 transition-all duration-500"
            style={{ width: `${unallocatedPct}%` }}
          />
        )}
      </div>

      {/* Legend chips */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          {Math.round(allocatedPct)}% {t('budget.flow.allocated').toLowerCase()}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          {Math.round(savingsPct)}% {t('budget.flow.saved').toLowerCase()}
        </span>
        {unallocatedPct > 1 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
            {Math.round(unallocatedPct)}% {t('budget.flow.unallocated').toLowerCase()}
          </span>
        )}
      </div>
    </div>
  )
}

function FlowNode({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center min-w-0 flex-1">
      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
        {label}
      </p>
      <p className={cn('text-sm font-bold truncate', color)}>{value}</p>
    </div>
  )
}
