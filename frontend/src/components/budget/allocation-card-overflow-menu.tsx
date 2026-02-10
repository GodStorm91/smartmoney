import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/utils/cn'

interface OverflowMenuProps {
  isDraft?: boolean
  onEdit: () => void
  onDelete: () => void
  onQuickAdjust?: (adjustment: number | 'percent') => void
}

export function AllocationOverflowMenu({ isDraft, onEdit, onDelete, onQuickAdjust }: OverflowMenuProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowDeleteConfirm(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
    setShowDeleteConfirm(false)
  }

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
    setIsOpen(false)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showDeleteConfirm) {
      onDelete()
      setIsOpen(false)
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={handleToggle}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t('budget.cardActions', 'Actions')}
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
          <button
            onClick={(e) => handleAction(e, onEdit)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            {t('budget.editAmount')}
          </button>

          {isDraft && onQuickAdjust && (
            <>
              <button
                onClick={(e) => handleAction(e, () => onQuickAdjust(5000))}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                +5,000
              </button>
              <button
                onClick={(e) => handleAction(e, () => onQuickAdjust(-5000))}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowDown className="w-4 h-4" />
                -5,000
              </button>
              <button
                onClick={(e) => handleAction(e, () => onQuickAdjust('percent'))}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="w-4 h-4 text-center text-xs font-bold">%</span>
                +10%
              </button>
            </>
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

          <button
            onClick={handleDeleteClick}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors',
              showDeleteConfirm
                ? 'text-white bg-red-600 hover:bg-red-700'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            )}
          >
            <Trash2 className="w-4 h-4" />
            {showDeleteConfirm ? t('budget.deleteConfirm') : t('delete')}
          </button>
        </div>
      )}
    </div>
  )
}
