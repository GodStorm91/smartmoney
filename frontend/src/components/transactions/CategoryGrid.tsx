import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useCustomCategories } from '@/hooks/useCategories'
import { CreateCategoryModal } from './CreateCategoryModal'
import type { CategoryOption } from './constants/categories'

interface CategoryGridProps {
  categories: CategoryOption[]
  selected: string
  onSelect: (categoryId: string) => void
  isIncome?: boolean
}

export function CategoryGrid({ categories, selected, onSelect, isIncome = false }: CategoryGridProps) {
  const { t } = useTranslation('common')
  const { data: customCategories = [] } = useCustomCategories()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Filter custom categories by type
  const filteredCustom = customCategories.filter(
    c => c.type === (isIncome ? 'income' : 'expense')
  )

  // Convert custom categories to CategoryOption format
  const customOptions: CategoryOption[] = filteredCustom.map(c => ({
    id: `custom_${c.id}`,
    labelKey: c.name,
    icon: c.icon,
    value: c.name,
  }))

  // All categories: predefined + custom
  const allCategories = [...categories, ...customOptions]

  const handleCreated = (categoryId: string) => {
    onSelect(categoryId)
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {allCategories.map((category) => {
          const isCustom = category.id.startsWith('custom_')
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg',
                'min-h-[64px] transition-colors',
                selected === category.id
                  ? 'bg-primary-100 border-2 border-primary-500 dark:bg-primary-900'
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
              )}
            >
              <span className="text-2xl mb-1">{category.icon}</span>
              <span className="text-xs text-center truncate w-full dark:text-gray-200">
                {isCustom ? category.labelKey : t(category.labelKey, category.id)}
              </span>
            </button>
          )
        })}

        {/* Add Custom Button */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className={cn(
            'flex flex-col items-center justify-center p-3 rounded-lg',
            'min-h-[64px] transition-colors',
            'bg-gray-50 border-2 border-dashed border-gray-300',
            'hover:bg-gray-100 hover:border-gray-400',
            'dark:bg-gray-700 dark:border-gray-500 dark:hover:bg-gray-600'
          )}
        >
          <Plus className="w-6 h-6 mb-1 text-gray-400" />
          <span className="text-xs text-center text-gray-500 dark:text-gray-400">
            {t('category.addCustom', 'Add')}
          </span>
        </button>
      </div>

      <CreateCategoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultType={isIncome ? 'income' : 'expense'}
        onCreated={handleCreated}
      />
    </>
  )
}
