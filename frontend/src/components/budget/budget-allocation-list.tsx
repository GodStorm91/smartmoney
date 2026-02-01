import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import { useCategoryTree } from '@/hooks/useCategories'
import { useTopTransactionsByCategory } from '@/hooks/useTopTransactionsByCategory'
import { updateAllocation, deleteAllocation } from '@/services/budget-service'
import { AllocationCard } from './budget-allocation-card'
import type { BudgetAllocation, BudgetTracking, BudgetTrackingItem } from '@/types'

interface BudgetAllocationListProps {
  budgetId: number
  allocations: BudgetAllocation[]
  totalBudget: number
  tracking?: BudgetTracking
  month?: string
  daysRemaining?: number
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
  daysRemaining,
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

  // Build budget map for top transactions hook
  const budgetMap = useMemo(() => {
    const map = new Map<string, number>()
    allocations.forEach(a => map.set(a.category, a.amount))
    return map
  }, [allocations])

  // Fetch top transactions for all categories
  const categories = useMemo(() => allocations.map(a => a.category), [allocations])
  const { data: topTransactionsData } = useTopTransactionsByCategory(
    categories,
    month || '',
    budgetMap,
    3 // top 3 transactions per category
  )

  // Helper to safely get from Map (handles case where data might not be a Map)
  const getTopTransactions = (category: string) => {
    if (!topTransactionsData) return []
    if (topTransactionsData instanceof Map) {
      return topTransactionsData.get(category)?.transactions || []
    }
    return []
  }

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

  // Map child category to parent category name
  const childToParentMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!categoryTree) return map

    categoryTree.expense.forEach(parent => {
      parent.children.forEach(child => {
        map.set(child.name, parent.name)
      })
    })

    categoryTree.income.forEach(parent => {
      parent.children.forEach(child => {
        map.set(child.name, parent.name)
      })
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
                    topTransactions={getTopTransactions(allocation.category)}
                    daysRemaining={daysRemaining}
                    parentCategory={childToParentMap.get(allocation.category)}
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
