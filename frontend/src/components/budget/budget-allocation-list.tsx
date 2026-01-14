import { useState, useRef, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Pencil, Trash2, Plus, ArrowUp, ArrowDown, LayoutGrid } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
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
  onAddCategory?: () => void
  onAllocationChange?: (updatedAllocations: BudgetAllocation[]) => void
}

type SortOption = 'priority' | 'amount' | 'category' | 'percentage'
type GroupOption = 'none' | 'needs-wants'

export function BudgetAllocationList({
  budgetId,
  allocations,
  totalBudget,
  tracking,
  month,
  isDraft,
  onAddCategory,
  onAllocationChange
}: BudgetAllocationListProps) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: categoryTree } = useCategoryTree()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [groupBy, setGroupBy] = useState<GroupOption>('none')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Budget allocation amounts are in user's display currency (native)
  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

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

  const trackingMap = new Map<string, BudgetTrackingItem>()
  if (tracking?.categories) {
    tracking.categories.forEach(item => {
      trackingMap.set(item.category, item)
    })
  }

  const updateMutation = useMutation({
    mutationFn: ({ category, amount }: { category: string; amount: number }) =>
      updateAllocation(budgetId, category, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (category: string) => deleteAllocation(budgetId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] })
    },
  })

  const handleCategoryClick = (category: string) => {
    const children = parentToChildrenMap.get(category) || []
    const categories = [category, ...children].join(',')
    navigate({
      to: '/transactions',
      search: { categories, month: month || undefined }
    })
  }

  const categorizeAllocation = (allocation: BudgetAllocation): 'need' | 'want' | 'savings' => {
    const category = allocation.category.toLowerCase()
    const needsKeywords = ['housing', 'rent', 'utilities', 'electric', 'gas', 'water', 'internet', 'phone', 'insurance', 'groceries', 'transportation', 'medical', 'health']
    const savingsKeywords = ['savings', 'investment', 'retirement', 'emergency', 'fund']

    if (savingsKeywords.some(k => category.includes(k))) return 'savings'
    if (needsKeywords.some(k => category.includes(k))) return 'need'
    return 'want'
  }

  const sortedAllocations = useMemo(() => {
    let sorted = [...allocations]

    sorted.sort((a, b) => {
      const trackingA = trackingMap.get(a.category)
      const trackingB = trackingMap.get(b.category)
      const spentA = trackingA?.spent || 0
      const spentB = trackingB?.spent || 0
      const budgetedA = trackingA?.budgeted || a.amount
      const budgetedB = trackingB?.budgeted || b.amount
      const percentA = budgetedA > 0 ? spentA / budgetedA : 0
      const percentB = budgetedB > 0 ? spentB / budgetedB : 0
      const overA = spentA - budgetedA
      const overB = spentB - budgetedB

      let comparison = 0

      switch (sortBy) {
        case 'priority':
          comparison = overB - overA
          if (comparison === 0) comparison = percentB - percentA
          break
        case 'amount':
          comparison = b.amount - a.amount
          break
        case 'category':
          comparison = a.category.localeCompare(b.category)
          break
        case 'percentage':
          comparison = percentB - percentA
          break
      }

      return sortDirection === 'asc' ? -comparison : comparison
    })

    return sorted
  }, [allocations, sortBy, sortDirection, trackingMap])

  const groupedAllocations = useMemo(() => {
    if (groupBy === 'none') return { default: sortedAllocations }

    const groups: Record<string, BudgetAllocation[]> = {
      need: [],
      want: [],
      savings: [],
    }

    sortedAllocations.forEach(allocation => {
      const type = categorizeAllocation(allocation)
      groups[type].push(allocation)
    })

    return groups
  }, [sortedAllocations, groupBy])

  const handleQuickAdjust = (index: number, adjustment: number | 'percent') => {
    if (!isDraft || !onAllocationChange) return

    const allocation = allocations[index]
    let newAmount = allocation.amount

    if (adjustment === 'percent') {
      newAmount = Math.floor(allocation.amount * 1.1)
    } else {
      newAmount = Math.max(0, allocation.amount + (adjustment as number))
    }

    const updated = [...allocations]
    updated[index] = { ...allocation, amount: newAmount }
    onAllocationChange(updated)
  }

  const toggleSort = (column: SortOption) => {
    if (sortBy === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('desc')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold">{t('budget.allocations')}</h3>
        <div className="flex items-center gap-2">
          {onAddCategory && (
            <Button variant="outline" size="sm" onClick={onAddCategory}>
              <Plus className="w-4 h-4 mr-1" />
              {t('budget.addCategory')}
            </Button>
          )}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupOption)}
              className="text-sm bg-transparent border-none px-2 py-1"
            >
              <option value="none">{t('budget.groupNone')}</option>
              <option value="needs-wants">{t('budget.groupNeedsWants')}</option>
            </select>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => toggleSort('priority')}
              className={cn(
                'px-2 py-1 text-xs rounded',
                sortBy === 'priority' ? 'bg-white dark:bg-gray-700 shadow' : ''
              )}
            >
              {t('budget.sortPriority')}
            </button>
            <button
              onClick={() => toggleSort('amount')}
              className={cn(
                'px-2 py-1 text-xs rounded',
                sortBy === 'amount' ? 'bg-white dark:bg-gray-700 shadow' : ''
              )}
            >
              {t('budget.sortAmount')}
            </button>
          </div>
        </div>
      </div>

      {isDraft && onAllocationChange && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('budget.tapToEdit', 'Tap amount to edit or use quick buttons')}
        </p>
      )}

      {Object.entries(groupedAllocations).map(([groupName, groupAllocations]) => (
        groupAllocations.length > 0 && (
          <div key={groupName} className="mb-6">
            {groupBy === 'needs-wants' && (
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                {groupName === 'need' ? t('budget.needs') :
                 groupName === 'want' ? t('budget.wants') : t('budget.savings')}
                <span className="text-xs text-gray-400">({groupAllocations.length})</span>
              </h4>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupAllocations.map((allocation) => {
                const originalIndex = allocations.findIndex(a => a.category === allocation.category)
                return (
                  <AllocationCard
                    key={allocation.category}
                    allocation={allocation}
                    totalBudget={totalBudget}
                    trackingItem={trackingMap.get(allocation.category)}
                    isDraft={isDraft}
                    isUpdating={updateMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                    formatCurrency={formatCurrency}
                    onAmountChange={(newAmount) => {
                      if (isDraft && onAllocationChange) {
                        const updated = [...allocations]
                        updated[originalIndex] = { ...allocation, amount: newAmount }
                        onAllocationChange(updated)
                      } else {
                        updateMutation.mutate({ category: allocation.category, amount: newAmount })
                      }
                    }}
                    onDelete={() => {
                      if (isDraft && onAllocationChange) {
                        const updated = allocations.filter((_, i) => i !== originalIndex)
                        onAllocationChange(updated)
                      } else {
                        deleteMutation.mutate(allocation.category)
                      }
                    }}
                    onCategoryClick={() => handleCategoryClick(allocation.category)}
                    onQuickAdjust={(adjustment) => handleQuickAdjust(originalIndex, adjustment)}
                  />
                )
              })}
            </div>
          </div>
        )
      ))}
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
  formatCurrency: (amount: number) => string
  onAmountChange: (newAmount: number) => void
  onDelete: () => void
  onCategoryClick: () => void
  onQuickAdjust: (adjustment: number | 'percent') => void
}

function AllocationCard({
  allocation,
  totalBudget,
  trackingItem,
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
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h4 className="font-semibold dark:text-gray-100 truncate">{allocation.category}</h4>
          {trackingItem && isOverBudget && (
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-label={t('budget.overBudget')} />
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-24 text-right text-lg font-bold border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          ) : (
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {formatCurrency(allocation.amount)}
            </span>
          )}

          {isDraft && !isEditing && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onQuickAdjust(-5000) }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Decrease by 5000"
              >
                <ArrowDown className="w-3 h-3 text-gray-500" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onQuickAdjust(5000) }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Increase by 5000"
              >
                <ArrowUp className="w-3 h-3 text-gray-500" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onQuickAdjust('percent') }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Increase by 10%"
              >
                <span className="text-xs font-medium text-gray-500">+10%</span>
              </button>
            </>
          )}

          {!isEditing && (
            <button
              onClick={handleEditClick}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('budget.editAmount', 'Edit amount')}
            >
              <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          <button
            onClick={handleDeleteClick}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            aria-label={t('budget.deleteAllocation', 'Delete')}
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400" />
          </button>
        </div>
      </div>

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
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{allocation.reasoning}</p>
      )}

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
