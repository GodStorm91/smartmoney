import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { CategoryListPanel } from '../category-list-panel'
import { BudgetDetailPanel } from '../budget-detail-panel'
import { BudgetAllocationList } from '../budget-allocation-list'
import { cn } from '@/utils/cn'
import type { Budget, BudgetTracking, BudgetAllocation } from '@/types'

interface CategoriesTabProps {
  budget: Budget
  tracking?: BudgetTracking
  isDraft?: boolean
  selectedMonth: string
  onAddCategory?: () => void
  onAllocationChange?: (allocations: BudgetAllocation[]) => void
}

export function CategoriesTab({
  budget,
  tracking,
  isDraft,
  selectedMonth,
  onAddCategory,
  onAllocationChange
}: CategoriesTabProps) {
  const { t } = useTranslation('common')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    budget.allocations[0]?.category || null
  )
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const totalBudget = budget.monthly_income - (budget.savings_target || 0)

  const getTrackingItem = useCallback((category: string) => {
    return tracking?.categories?.find(c => c.category === category)
  }, [tracking])

  const handleToggleExpand = useCallback((category: string) => {
    setExpandedCategory(prev => prev === category ? null : category)
  }, [])

  return (
    <div className="space-y-4">
      {/* Desktop: Split View */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr] lg:gap-4 lg:min-h-[500px]">
        {/* Left Panel: Category List */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          <CategoryListPanel
            allocations={budget.allocations}
            trackingItems={tracking?.categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            isDraft={isDraft}
            onAddCategory={onAddCategory}
          />
        </div>

        {/* Right Panel: Category Details */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          {selectedCategory ? (
            <BudgetDetailPanel
              category={selectedCategory}
              month={selectedMonth}
              trackingItem={getTrackingItem(selectedCategory)}
              isOpen={true}
              onClose={() => setSelectedCategory(null)}
              mode="inline"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
              {t('budget.selectCategoryHint')}
            </div>
          )}
        </div>
      </div>

      {/* Editable Allocation List - shown on all screen sizes */}
      <BudgetAllocationList
        budgetId={budget.id}
        allocations={budget.allocations}
        totalBudget={totalBudget}
        tracking={tracking}
        month={selectedMonth}
        isDraft={isDraft}
        onAddCategory={onAddCategory}
        onAllocationChange={onAllocationChange}
      />

      {/* Mobile Detail Panel (Overlay) */}
      <div className="lg:hidden">
        <BudgetDetailPanel
          category={selectedCategory || ''}
          month={selectedMonth}
          trackingItem={selectedCategory ? getTrackingItem(selectedCategory) : undefined}
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          mode="overlay"
        />
      </div>
    </div>
  )
}
