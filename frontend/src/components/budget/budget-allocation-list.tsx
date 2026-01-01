import { useState, useRef, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { useCategoryTree } from '@/hooks/useCategories'
import type { BudgetAllocation, BudgetTracking, BudgetTrackingItem } from '@/types'

interface BudgetAllocationListProps {
  allocations: BudgetAllocation[]
  totalBudget: number
  tracking?: BudgetTracking
  month?: string  // Budget month in YYYY-MM format
  isDraft?: boolean  // When true, disable navigation to transactions
  onAllocationChange?: (updatedAllocations: BudgetAllocation[]) => void
}

export function BudgetAllocationList({
  allocations,
  totalBudget,
  tracking,
  month,
  isDraft,
  onAllocationChange
}: BudgetAllocationListProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: categoryTree } = useCategoryTree()

  // Build a map of parent category -> all child category names
  const parentToChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!categoryTree) return map

    // Process expense categories
    categoryTree.expense.forEach(parent => {
      const childNames = parent.children.map(child => child.name)
      map.set(parent.name, childNames)
    })

    // Process income categories
    categoryTree.income.forEach(parent => {
      const childNames = parent.children.map(child => child.name)
      map.set(parent.name, childNames)
    })

    return map
  }, [categoryTree])

  // Create a map of tracking items by category for quick lookup
  const trackingMap = new Map<string, BudgetTrackingItem>()
  if (tracking?.categories) {
    tracking.categories.forEach(item => {
      trackingMap.set(item.category, item)
    })
  }

  // Navigate to transactions filtered by category (including children) and month
  const handleCategoryClick = (category: string) => {
    // Get child categories for this parent
    const children = parentToChildrenMap.get(category) || []
    // Include parent + all children as comma-separated list
    const categories = [category, ...children].join(',')

    navigate({
      to: '/transactions',
      search: { categories, month: month || undefined }
    })
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('budget.allocations')}</h3>
      {onAllocationChange && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('budget.tapToEdit', 'Tap amount to edit')}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allocations.map((allocation, index) => (
          <AllocationCard
            key={index}
            allocation={allocation}
            totalBudget={totalBudget}
            trackingItem={trackingMap.get(allocation.category)}
            editable={!!onAllocationChange}
            isDraft={isDraft}
            onAmountChange={(newAmount) => {
              if (onAllocationChange) {
                const updated = [...allocations]
                updated[index] = { ...allocation, amount: newAmount }
                onAllocationChange(updated)
              }
            }}
            onCategoryClick={() => handleCategoryClick(allocation.category)}
          />
        ))}
      </div>
    </div>
  )
}

interface AllocationCardProps {
  allocation: BudgetAllocation
  totalBudget: number
  trackingItem?: BudgetTrackingItem
  editable: boolean
  isDraft?: boolean
  onAmountChange: (newAmount: number) => void
  onCategoryClick: () => void
}

function AllocationCard({
  allocation,
  totalBudget,
  trackingItem,
  editable,
  isDraft,
  onAmountChange,
  onCategoryClick
}: AllocationCardProps) {
  const { t } = useTranslation('common')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle tap-to-edit
  const handleAmountClick = () => {
    if (!editable) return
    setEditValue(String(allocation.amount))
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleBlur = () => {
    const newAmount = parseInt(editValue) || 0
    if (newAmount !== allocation.amount) {
      onAmountChange(newAmount)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const percentage = totalBudget > 0 ? (allocation.amount / totalBudget) * 100 : 0

  // Tracking calculations
  const spent = trackingItem?.spent || 0
  const budgeted = trackingItem?.budgeted || allocation.amount
  const remaining = budgeted - spent
  const spentPercent = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0
  const isOverBudget = spent > budgeted
  const overAmount = spent - budgeted

  // Color based on spent percentage
  const getProgressBarColor = () => {
    if (isOverBudget) return 'bg-red-500'
    if (spentPercent >= 80) return 'bg-orange-500'
    if (spentPercent >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // In draft mode: clicking card does nothing (user edits amounts)
  // In saved mode: clicking card navigates to transactions
  const handleCardClick = () => {
    if (!isDraft) {
      onCategoryClick()
    }
  }

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        isDraft
          ? "border-dashed border-blue-300 dark:border-blue-700"  // Draft: dashed border, no nav
          : "cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600"  // Saved: clickable
      )}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold dark:text-gray-100">{allocation.category}</h4>
          {trackingItem && isOverBudget && (
            <AlertTriangle className="w-4 h-4 text-red-500" aria-label={t('budget.overBudget')} />
          )}
        </div>

        {/* Tap-to-edit amount */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-32 text-right text-lg font-bold border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleAmountClick()
            }}
            className={cn(
              'text-lg font-bold text-blue-600 dark:text-blue-400',
              editable && 'hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded cursor-pointer transition-colors'
            )}
          >
            {formatCurrency(allocation.amount)}
          </button>
        )}
      </div>

      {allocation.reasoning && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{allocation.reasoning}</p>
      )}

      {/* Budget allocation bar (% of total budget) */}
      <div className="mt-2">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {percentage.toFixed(1)}% {t('budget.ofTotal')}
        </p>
      </div>

      {/* Tracking progress bar (spent vs budget) */}
      {trackingItem && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {/* Spent / Budgeted display */}
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">
              {formatCurrency(spent)} / {formatCurrency(budgeted)}
            </span>
            <span className={cn(
              'font-medium',
              isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            )}>
              {isOverBudget ? (
                <>⚠️ {t('budget.overBy', { amount: formatCurrency(overAmount) })}</>
              ) : (
                <>{formatCurrency(remaining)} {t('budget.remaining')}</>
              )}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', getProgressBarColor())}
              style={{ width: `${Math.min(spentPercent, 100)}%` }}
            />
          </div>

          {/* Over-budget indicator bar */}
          {isOverBudget && (
            <div className="h-1 bg-red-200 dark:bg-red-900/50 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{ width: `${Math.min(((spent - budgeted) / budgeted) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
