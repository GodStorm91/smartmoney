import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleAlert, TriangleAlert, CircleCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { DeltaBadge } from './DeltaBadge'
import { BudgetAdherenceTable } from './BudgetAdherenceTable'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import type { FocusAreaItem, BudgetAdherence } from '@/types'

interface FocusAreasProps {
  focusAreas: FocusAreaItem[]
  budgetAdherence: BudgetAdherence
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'over_budget':
      return <CircleAlert className="w-5 h-5 text-red-500 shrink-0" />
    case 'threshold_80':
      return <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0" />
    case 'threshold_50':
      return <TriangleAlert className="w-5 h-5 text-yellow-500 shrink-0" />
    default:
      return <CircleCheck className="w-5 h-5 text-green-500 shrink-0" />
  }
}

function statusBg(status: string) {
  switch (status) {
    case 'over_budget': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    case 'threshold_80': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    case 'threshold_50': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    default: return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
  }
}

export function FocusAreas({ focusAreas, budgetAdherence }: FocusAreasProps) {
  const { t } = useTranslation('common')
  const [showAll, setShowAll] = useState(false)
  const totalCategories = budgetAdherence.category_status.length

  if (focusAreas.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        {t('report.noFocusAreas')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {focusAreas.map((item) => (
        <div
          key={item.category}
          className={cn('rounded-lg border p-3', statusBg(item.status))}
        >
          <div className="flex items-start gap-3">
            <StatusIcon status={item.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {item.category}
                </span>
                <DeltaBadge value={item.spending_change} invertColor />
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                {formatCurrency(Math.abs(item.spent))} / {formatCurrency(item.budget_amount)}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t(item.suggestion_key, item.suggestion_params)}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* See all toggle */}
      {totalCategories > focusAreas.length && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline w-full justify-center py-2"
        >
          {showAll
            ? t('report.hideAll')
            : t('report.seeAll', { count: totalCategories })}
          {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}

      {showAll && <BudgetAdherenceTable data={budgetAdherence} />}
    </div>
  )
}
