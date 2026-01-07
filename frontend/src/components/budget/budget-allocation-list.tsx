import { useState, useRef, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { useCategoryTree } from '@/hooks/useCategories'
import { updateAllocation, deleteAllocation } from '@/services/budget-service'
import type { BudgetAllocation, BudgetTracking, BudgetTrackingItem } from '@/types'

interface BudgetAllocationListProps {
  budgetId: number
  allocations: BudgetAllocation[]
  totalBudget: number
  tracking?: BudgetTracking
  month?: string
  isDraft?: boolean
  onAllocationChange?: (updatedAllocations: BudgetAllocation[]) => void
}

export function BudgetAllocationList({
  budgetId,
  allocations,
  totalBudget,
  tracking,
  month,
  isDraft,
  onAllocationChange
}: BudgetAllocationListProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: categoryTree } = useCategoryTree()

  // Build a map of parent category -> all child category names
  const parentToChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!categoryTree) return map

    categoryTree.expense.forEach(parent => {
      const childNames = parent.children.map(child => child.name)
      map.set(parent.name, childNames)
    })

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

  // Update allocation mutation (for saved budgets)
  const updateMutation = useMutation({
    mutationFn: ({ category, amount }: { category: string; amount: number }) =>
      updateAllocation(budgetId, category, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })

  // Delete allocation mutation
  const deleteMutation = useMutation({
    mutationFn: (category: string) => deleteAllocation(budgetId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })

  // Navigate to transactions filtered by category and month
  const handleCategoryClick = (category: string) => {
    const children = parentToChildrenMap.get(category) || []
    const categories = [category, ...children].join(',')

    navigate({
      to: '/transactions',
      search: { categories, month: month || undefined }
    })
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('budget.allocations')}</h3>
      {isDraft && onAllocationChange && (
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
            isDraft={isDraft}
            isUpdating={updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
            onAmountChange={(newAmount) => {
              if (isDraft && onAllocationChange) {
                // Draft mode: update local state
                const updated = [...allocations]
                updated[index] = { ...allocation, amount: newAmount }
                onAllocationChange(updated)
              } else {
                // Saved mode: call API
                updateMutation.mutate({ category: allocation.category, amount: newAmount })
              }
            }}
            onDelete={() => {
              if (isDraft && onAllocationChange) {
                // Draft mode: remove from local state
                const updated = allocations.filter((_, i) => i !== index)
                onAllocationChange(updated)
              } else {
                // Saved mode: call API
                deleteMutation.mutate(allocation.category)
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
  isDraft?: boolean
  isUpdating?: boolean
  isDeleting?: boolean
  onAmountChange: (newAmount: number) => void
  onDelete: () => void
  onCategoryClick: () => void
}

function AllocationCard({
  allocation,
  totalBudget,
  trackingItem,
  isDraft,
  isUpdating,
  isDeleting,
  onAmountChange,
  onDelete,
  onCategoryClick
}: AllocationCardProps) {
  const { t } = useTranslation('common')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  const percentage = totalBudget > 0 ? (allocation.amount / totalBudget) * 100 : 0

  // Tracking calculations
  const spent = trackingItem?.spent || 0
  const budgeted = trackingItem?.budgeted || allocation.amount
  const remaining = budgeted - spent
  const spentPercent = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0
  const isOverBudget = spent > budgeted
  const overAmount = spent - budgeted

  const getProgressBarColor = () => {
    if (isOverBudget) return 'bg-red-500'
    if (spentPercent >= 80) return 'bg-orange-500'
    if (spentPercent >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleCardClick = () => {
    if (!isDraft && !showDeleteConfirm) {
      onCategoryClick()
    }
  }

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        isDraft
          ? "border-dashed border-blue-300 dark:border-blue-700"
          : "cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
        (isUpdating || isDeleting) && "opacity-50 pointer-events-none"
      )}
      onClick={handleCardClick}
    >
      {/* Header with category name, amount, and action buttons */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold dark:text-gray-100">{allocation.category}</h4>
          {trackingItem && isOverBudget && (
            <AlertTriangle className="w-4 h-4 text-red-500" aria-label={t('budget.overBudget')} />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Amount display or edit input */}
          {isEditing ? (
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-28 text-right text-lg font-bold border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          ) : (
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(allocation.amount)}
            </span>
          )}

          {/* Edit button */}
          {!isEditing && (
            <button
              onClick={handleEditClick}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('budget.editAmount', 'Edit amount')}
            >
              <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={handleDeleteClick}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            aria-label={t('budget.deleteAllocation', 'Delete')}
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 mb-2">
            {t('budget.deleteConfirm', 'Delete this category?')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancelDelete}
              className="flex-1 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex-1 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      )}

      {allocation.reasoning && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{allocation.reasoning}</p>
      )}

      {/* Budget allocation bar */}
      <div className="mt-2">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {percentage.toFixed(1)}% {t('budget.ofTotal')}
        </p>
      </div>

      {/* Tracking progress bar */}
      {trackingItem && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">
              {formatCurrency(spent)} / {formatCurrency(budgeted)}
            </span>
            <span className={cn(
              'font-medium',
              isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            )}>
              {isOverBudget ? (
                <>{t('budget.overBy', { amount: formatCurrency(overAmount) })}</>
              ) : (
                <>{formatCurrency(remaining)} {t('budget.remaining')}</>
              )}
            </span>
          </div>

          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', getProgressBarColor())}
              style={{ width: `${Math.min(spentPercent, 100)}%` }}
            />
          </div>

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
