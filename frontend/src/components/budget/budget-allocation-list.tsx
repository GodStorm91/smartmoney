import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useCategoryTree } from '@/hooks/useCategories'
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

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  const parentToChildrenMap = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!categoryTree) return map
    for (const group of [...categoryTree.expense, ...categoryTree.income]) {
      map.set(group.name, group.children.map(c => c.name))
    }
    return map
  }, [categoryTree])

  const trackingMap = useMemo(() => {
    const map = new Map<string, BudgetTrackingItem>()
    tracking?.categories?.forEach(item => map.set(item.category, item))
    return map
  }, [tracking])

  // Auto-sort by urgency: over-budget first, then by % spent descending
  const sortedAllocations = useMemo(() => {
    return [...allocations].sort((a, b) => {
      const tA = trackingMap.get(a.category)
      const tB = trackingMap.get(b.category)
      const spentA = tA?.spent || 0
      const spentB = tB?.spent || 0
      const budgetedA = tA?.budgeted || a.amount
      const budgetedB = tB?.budgeted || b.amount
      const overA = spentA - budgetedA
      const overB = spentB - budgetedB

      // Over-budget categories float to top
      if (overA > 0 && overB <= 0) return -1
      if (overB > 0 && overA <= 0) return 1

      // Then by % spent descending
      const pctA = budgetedA > 0 ? spentA / budgetedA : 0
      const pctB = budgetedB > 0 ? spentB / budgetedB : 0
      return pctB - pctA
    })
  }, [allocations, trackingMap])

  const updateMutation = useMutation({
    mutationFn: ({ category, amount }: { category: string; amount: number }) =>
      updateAllocation(budgetId, category, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (category: string) => deleteAllocation(budgetId, category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget'] }),
  })

  const handleCategoryClick = (category: string) => {
    const children = parentToChildrenMap.get(category) || []
    navigate({
      to: '/transactions',
      search: { categories: [category, ...children].join(','), month: month || undefined }
    })
  }

  const handleQuickAdjust = (index: number, adjustment: number | 'percent') => {
    if (!isDraft || !onAllocationChange) return
    const allocation = allocations[index]
    const newAmount = adjustment === 'percent'
      ? Math.floor(allocation.amount * 1.1)
      : Math.max(0, allocation.amount + adjustment)
    const updated = [...allocations]
    updated[index] = { ...allocation, amount: newAmount }
    onAllocationChange(updated)
  }

  return (
    <div>
      {/* Header — just title + add button */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold dark:text-white">{t('budget.allocations')}</h3>
        {onAddCategory && (
          <Button variant="outline" size="sm" onClick={onAddCategory}>
            <Plus className="w-4 h-4 mr-1" />
            {t('budget.addCategory')}
          </Button>
        )}
      </div>

      {isDraft && onAllocationChange && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {t('budget.tapToEdit')}
        </p>
      )}

      {/* Cards grid — auto-sorted by urgency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedAllocations.map((allocation) => {
          const originalIndex = allocations.findIndex(a => a.category === allocation.category)
          return (
            <AllocationCard
              key={allocation.category}
              allocation={allocation}
              totalBudget={totalBudget}
              trackingItem={trackingMap.get(allocation.category)}
              daysRemaining={daysRemaining}
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
                  onAllocationChange(allocations.filter((_, i) => i !== originalIndex))
                } else {
                  deleteMutation.mutate(allocation.category)
                }
              }}
              onCategoryClick={() => handleCategoryClick(allocation.category)}
              onQuickAdjust={(adj) => handleQuickAdjust(originalIndex, adj)}
            />
          )
        })}
      </div>

      {allocations.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('budget.noAllocations')}
        </div>
      )}
    </div>
  )
}
