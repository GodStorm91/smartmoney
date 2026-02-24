import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { StatusBadgeMini, getBudgetStatus } from './status-badge'
import { AllocationOverflowMenu } from './allocation-card-overflow-menu'
import { AllocationInlineEdit } from './allocation-card-inline-edit'
import { cn } from '@/utils/cn'
import type { BudgetAllocation, BudgetTrackingItem } from '@/types'

export interface TopTransaction {
  id: number
  description: string
  amount: number
  currency: string
  date: string
  amountJpy: number
  isBig: boolean
}

interface AllocationCardProps {
  allocation: BudgetAllocation
  totalBudget: number
  trackingItem?: BudgetTrackingItem
  topTransactions?: TopTransaction[]
  daysRemaining?: number
  parentCategory?: string
  isDraft?: boolean
  isUpdating?: boolean
  isDeleting?: boolean
  formatCurrency: (amount: number) => string
  onAmountChange: (newAmount: number) => void
  onDelete: () => void
  onCategoryClick: () => void
  onQuickAdjust: (adjustment: number | 'percent') => void
}

function getNudgeText(
  t: (key: string, opts?: Record<string, unknown>) => string,
  formatCurrency: (amount: number) => string,
  spent: number,
  budgeted: number,
  spentPercent: number,
  daysRemaining?: number
): { text: string; className: string } | null {
  if (budgeted <= 0) return null

  const remaining = budgeted - spent

  if (spent > budgeted) {
    const overAmount = spent - budgeted
    return {
      text: t('budget.nudge.overTapToAdjust', { amount: formatCurrency(overAmount) }),
      className: 'text-red-600 dark:text-red-400'
    }
  }

  if (spentPercent >= 80) {
    const reduceBy = Math.round(spent - budgeted * 0.75)
    return {
      text: t('budget.nudge.reduceToStaySafe', { amount: formatCurrency(Math.max(reduceBy, 0)) }),
      className: 'text-amber-600 dark:text-amber-400'
    }
  }

  if (daysRemaining && daysRemaining > 0 && remaining > 0) {
    const dailyPace = Math.round(remaining / daysRemaining)
    return {
      text: t('budget.nudge.safeToSpend', { amount: formatCurrency(dailyPace) }),
      className: 'text-green-600 dark:text-green-400'
    }
  }

  return null
}

export function AllocationCard({
  allocation,
  trackingItem,
  daysRemaining,
  isDraft,
  isUpdating,
  isDeleting,
  formatCurrency,
  onAmountChange,
  onDelete,
  onCategoryClick,
  onQuickAdjust
}: AllocationCardProps) {
  const { t } = useTranslation('common')
  const [isEditing, setIsEditing] = useState(false)

  const spent = trackingItem?.spent || 0
  const budgeted = trackingItem?.budgeted || allocation.amount
  const spentPercent = budgeted > 0 ? (spent / budgeted) * 100 : 0
  const status = getBudgetStatus(spentPercent)

  const getBarColor = () => {
    if (spentPercent >= 100) return 'bg-red-500'
    if (spentPercent >= 80) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const nudge = trackingItem
    ? getNudgeText(t, formatCurrency, spent, budgeted, spentPercent, daysRemaining)
    : null

  const handleCardClick = () => {
    if (!isDraft && !isEditing) onCategoryClick()
  }

  return (
    <Card
      className={cn(
        'p-3 sm:p-4 transition-all',
        isDraft
          ? 'border-dashed border-primary-300 dark:border-primary-700'
          : 'cursor-pointer hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600',
        (isUpdating || isDeleting) && 'opacity-50 pointer-events-none'
      )}
      onClick={handleCardClick}
    >
      {/* Row 1: Category name + status + overflow menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {allocation.category}
          </h4>
          {trackingItem && <StatusBadgeMini status={status} />}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditing ? (
            <AllocationInlineEdit
              currentAmount={allocation.amount}
              onSave={(amount) => { onAmountChange(amount); setIsEditing(false) }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {formatCurrency(allocation.amount)}
              </span>
              <AllocationOverflowMenu
                isDraft={isDraft}
                onEdit={() => setIsEditing(true)}
                onDelete={onDelete}
                onQuickAdjust={isDraft ? onQuickAdjust : undefined}
              />
            </>
          )}
        </div>
      </div>

      {/* Row 2: Spent / Budgeted fraction */}
      {trackingItem && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatCurrency(spent)} / {formatCurrency(budgeted)}
        </p>
      )}

      {/* Row 3: Progress bar */}
      <div className="mt-2">
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-[width] duration-500 ease-out', getBarColor())}
            style={{ width: `${Math.min(spentPercent, 100)}%` }}
          />
        </div>
        {/* Over-budget overflow indicator */}
        {spentPercent > 100 && (
          <div className="h-1 bg-red-200 dark:bg-red-900/50 rounded-full mt-0.5 overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${Math.min(((spent - budgeted) / budgeted) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Row 4: Actionable nudge */}
      {nudge && (
        <p className={cn('text-xs font-medium mt-1.5', nudge.className)}>
          {nudge.text}
        </p>
      )}
    </Card>
  )
}
