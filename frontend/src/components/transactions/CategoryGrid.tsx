import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { CategoryOption } from './constants/categories'

interface CategoryGridProps {
  categories: CategoryOption[]
  selected: string
  onSelect: (categoryId: string) => void
}

export function CategoryGrid({ categories, selected, onSelect }: CategoryGridProps) {
  const { t } = useTranslation('common')

  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className={cn(
            'flex flex-col items-center justify-center p-3 rounded-lg',
            'min-h-[64px] transition-colors',
            selected === category.id
              ? 'bg-blue-100 border-2 border-blue-500'
              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
          )}
        >
          <span className="text-2xl mb-1">{category.icon}</span>
          <span className="text-xs text-center truncate w-full">
            {t(category.labelKey, category.id)}
          </span>
        </button>
      ))}
    </div>
  )
}
