import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateCategory, type UpdateCategoryPayload } from '@/services/category-service'
import { cn } from '@/utils/cn'

interface Category {
  id: number
  name: string
  icon: string
  type: string
}

interface EditCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category: Category | null
}

// Common emoji icons for categories
const EMOJI_OPTIONS = [
  '📁', '🏠', '🍽️', '🚗', '💡', '📱', '🎬', '🛍️', '🏥', '📦',
  '💰', '🎁', '📈', '💼', '🔄', '✈️', '🎓', '💳', '🏦', '🎮',
  '☕', '🍕', '🚌', '⛽', '💊', '🏋️', '🐕', '👶', '💅', '📚'
]

export function EditCategoryModal({
  isOpen,
  onClose,
  category,
}: EditCategoryModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [error, setError] = useState('')
  const [affectedCount, setAffectedCount] = useState<number | null>(null)

  // Initialize form with category values
  useEffect(() => {
    if (category) {
      setName(category.name)
      setIcon(category.icon)
      setError('')
      setAffectedCount(null)
    }
  }, [category])

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateCategoryPayload) =>
      updateCategory(category!.id, payload),
    onSuccess: (response) => {
      setAffectedCount(response.affected_transactions)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      // Show success briefly then close
      setTimeout(() => {
        handleClose()
      }, 1500)
    },
    onError: (err: unknown) => {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      setError(axiosError.response?.data?.detail || t('category.errors.updateFailed', 'Failed to update category'))
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t('category.errors.nameRequired', 'Name is required'))
      return
    }

    // Only send changed fields
    const payload: UpdateCategoryPayload = {}
    if (trimmedName !== category?.name) {
      payload.name = trimmedName
    }
    if (icon !== category?.icon) {
      payload.icon = icon
    }

    // If nothing changed, just close
    if (Object.keys(payload).length === 0) {
      handleClose()
      return
    }

    updateMutation.mutate(payload)
  }

  const handleClose = () => {
    setName('')
    setIcon('📁')
    setError('')
    setAffectedCount(null)
    onClose()
  }

  if (!isOpen || !category) return null

  const nameChanged = name.trim() !== category.name

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4"

    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('category.editTitle', 'Edit Category')}
          </h3>
          <button onClick={handleClose} className="p-2.5 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Success Message */}
        {affectedCount !== null && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              {t('category.updateSuccess', 'Category updated!')}
              {affectedCount > 0 && (
                <span className="block mt-1 text-green-600 dark:text-green-300">
                  {t('category.transactionsUpdated', '{{count}} transactions updated', { count: affectedCount })}
                </span>
              )}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('category.name', 'Category Name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('category.namePlaceholder', 'e.g., Subscriptions')}
              maxLength={50}
              className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
              autoFocus
            />
          </div>

          {/* Warning about cascade */}
          {nameChanged && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('category.cascadeWarning', 'All transactions with this category will be updated to the new name.')}
              </p>
            </div>
          )}

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('category.icon', 'Icon')}
            </label>
            <div className="grid grid-cols-10 gap-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'w-8 h-8 text-lg rounded flex items-center justify-center',
                    icon === emoji
                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Type (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('category.type', 'Type')}
            </label>
            <div className={cn(
              'h-10 px-3 flex items-center rounded-lg text-sm font-medium',
              category.type === 'expense'
                ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            )}>
              {category.type === 'expense'
                ? t('transaction.expense', 'Expense')
                : t('transaction.income', 'Income')}
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-10 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || affectedCount !== null}
              className="flex-1 h-10 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {updateMutation.isPending ? '...' : t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
