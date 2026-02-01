import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, ChevronLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCategoryTree, useCreateCategory } from '@/hooks/useCategories'
import { formatCurrency } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import type { Budget } from '@/types'
import type { CategoryParent, CategoryChild } from '@/types/category'

interface AddCategoryModalProps {
  budget: Budget
  onClose: () => void
  onAdd: (category: string, amount: number) => void
}

export function AddCategoryModal({ budget, onClose, onAdd }: AddCategoryModalProps) {
  const { t } = useTranslation('common')
  const { data: categoryTree } = useCategoryTree()
  const createMutation = useCreateCategory()

  const [selectedParent, setSelectedParent] = useState<CategoryParent | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁')

  const existingCategories = useMemo(() => {
    return new Set(budget.allocations.map(a => a.category))
  }, [budget.allocations])

  const remainingBudget = useMemo(() => {
    const totalAllocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0)
    return budget.monthly_income - (budget.savings_target || 0) - totalAllocated
  }, [budget])

  const categories = categoryTree?.expense || []

  const handleParentClick = (parent: CategoryParent) => {
    // If all children already have allocations, select the parent itself
    const availableChildren = parent.children.filter(c => !existingCategories.has(c.name))
    if (availableChildren.length === 0 && !existingCategories.has(parent.name)) {
      setSelectedCategory(parent.name)
    } else {
      setSelectedParent(parent)
    }
    setShowAddForm(false)
  }

  const handleChildClick = (child: CategoryChild) => {
    setSelectedCategory(child.name)
  }

  const handleBack = () => {
    setSelectedParent(null)
    setSelectedCategory('')
    setShowAddForm(false)
  }

  const handleAddCategory = async () => {
    if (!selectedParent || !newCategoryName.trim()) return

    await createMutation.mutateAsync({
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      parent_id: selectedParent.id,
      type: 'expense',
    })

    setSelectedCategory(newCategoryName.trim())
    setNewCategoryName('')
    setShowAddForm(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory || parseInt(amount) <= 0) return
    onAdd(selectedCategory, parseInt(amount))
  }

  const suggestedAmount = Math.floor(remainingBudget / 3)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">{t('budget.addCategory')}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Category Selection with Hierarchical Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('budget.category')}
            </label>

            {selectedCategory ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <span className="flex-1 font-medium text-blue-700 dark:text-blue-300">
                  {selectedCategory}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('')
                    setSelectedParent(null)
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  {t('change', 'Change')}
                </button>
              </div>
            ) : selectedParent ? (
              <div>
                {/* Back button */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-gray-600 mb-3 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {selectedParent.icon} {selectedParent.name}
                </button>

                {/* Children grid */}
                <div className="grid grid-cols-3 gap-2">
                  {selectedParent.children.map((child) => {
                    const isDisabled = existingCategories.has(child.name)
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => !isDisabled && handleChildClick(child)}
                        disabled={isDisabled}
                        className={cn(
                          'flex flex-col items-center justify-center p-3 rounded-lg',
                          'min-h-[64px] transition-colors',
                          isDisabled
                            ? 'bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                        )}
                      >
                        <span className="text-2xl mb-1">{child.icon}</span>
                        <span className="text-xs text-center truncate w-full dark:text-gray-200">
                          {child.name}
                        </span>
                        {isDisabled && (
                          <span className="text-[10px] text-gray-400">{t('budget.alreadyAdded', 'Added')}</span>
                        )}
                      </button>
                    )
                  })}

                  {/* Add custom button */}
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-lg',
                      'min-h-[64px] transition-colors',
                      'bg-gray-50 border-2 border-dashed border-gray-300 hover:bg-gray-100',
                      'dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700'
                    )}
                  >
                    <Plus className="w-6 h-6 mb-1 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('category.addCustom', 'Add')}
                    </span>
                  </button>
                </div>

                {/* Add category form */}
                {showAddForm && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newCategoryIcon}
                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                        className="w-16 text-center text-xl"
                        maxLength={2}
                      />
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={t('category.namePlaceholder', 'Category name')}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                        {t('cancel', 'Cancel')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim() || createMutation.isPending}
                      >
                        {t('create', 'Create')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Parent categories grid */
              <div className="grid grid-cols-3 gap-2">
                {categories.map((parent) => {
                  const availableChildren = parent.children.filter(c => !existingCategories.has(c.name))
                  const isFullyUsed = availableChildren.length === 0 && existingCategories.has(parent.name)

                  return (
                    <button
                      key={parent.id}
                      type="button"
                      onClick={() => !isFullyUsed && handleParentClick(parent)}
                      disabled={isFullyUsed}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-lg',
                        'min-h-[64px] transition-colors',
                        isFullyUsed
                          ? 'bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                      )}
                    >
                      <span className="text-2xl mb-1">{parent.icon}</span>
                      <span className="text-xs text-center truncate w-full dark:text-gray-200">
                        {parent.name}
                      </span>
                      {availableChildren.length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {availableChildren.length} {t('budget.available', 'available')}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Amount input - only show when category is selected */}
          {selectedCategory && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('budget.amount')}
                </label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={formatCurrency(0)}
                  min={1}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('budget.remainingBudget')}: {formatCurrency(remainingBudget)}
                </p>
              </div>

              {suggestedAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(suggestedAmount))}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('budget.suggestAmount', { amount: formatCurrency(suggestedAmount) })}
                </button>
              )}
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!selectedCategory || parseInt(amount) <= 0}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('budget.add')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
