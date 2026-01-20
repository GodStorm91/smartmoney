import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useCategoryTree, useCreateCategory } from '@/hooks/useCategories'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { CategoryParent, CategoryChild } from '@/types/category'

interface HierarchicalCategoryPickerProps {
  selected: string // child category name
  onSelect: (categoryName: string, parentName: string) => void
  isIncome?: boolean
}

export function HierarchicalCategoryPicker({
  selected,
  onSelect,
  isIncome = false,
}: HierarchicalCategoryPickerProps) {
  const { t } = useTranslation('common')
  const { data: tree, isLoading } = useCategoryTree()
  const createMutation = useCreateCategory()

  const [selectedParent, setSelectedParent] = useState<CategoryParent | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁')

  if (isLoading || !tree) {
    return <div className="animate-pulse h-48 bg-gray-100 dark:bg-gray-700 rounded-lg" />
  }

  const categories = isIncome ? tree.income : tree.expense

  // Find current selection's parent
  const findParentForChild = (childName: string): CategoryParent | null => {
    for (const parent of categories) {
      if (parent.children.some((c) => c.name === childName)) {
        return parent
      }
    }
    return null
  }

  const handleParentClick = (parent: CategoryParent) => {
    setSelectedParent(parent)
    setShowAddForm(false)
  }

  const handleChildClick = (child: CategoryChild) => {
    if (selectedParent) {
      onSelect(child.name, selectedParent.name)
    }
  }

  const handleBack = () => {
    setSelectedParent(null)
    setShowAddForm(false)
  }

  const handleAddCategory = async () => {
    if (!selectedParent || !newCategoryName.trim()) return

    await createMutation.mutateAsync({
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      parent_id: selectedParent.id,
      type: isIncome ? 'income' : 'expense',
    })

    onSelect(newCategoryName.trim(), selectedParent.name)
    setNewCategoryName('')
    setShowAddForm(false)
  }

  // Show children of selected parent
  if (selectedParent) {
    return (
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
          {selectedParent.children.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => handleChildClick(child)}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg',
                'min-h-[64px] transition-colors',
                selected === child.name
                  ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900'
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
              )}
            >
              <span className="text-2xl mb-1">{child.icon}</span>
              <span className="text-xs text-center truncate w-full dark:text-gray-200">
                {child.name}
              </span>
            </button>
          ))}

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
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button
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
    )
  }

  // Show parent categories
  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map((parent) => (
        <button
          key={parent.id}
          type="button"
          onClick={() => handleParentClick(parent)}
          className={cn(
            'flex flex-col items-center justify-center p-3 rounded-lg',
            'min-h-[64px] transition-colors',
            findParentForChild(selected)?.id === parent.id
              ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900'
              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
          )}
        >
          <span className="text-2xl mb-1">{parent.icon}</span>
          <span className="text-xs text-center truncate w-full dark:text-gray-200">
            {parent.name}
          </span>
        </button>
      ))}
    </div>
  )
}
