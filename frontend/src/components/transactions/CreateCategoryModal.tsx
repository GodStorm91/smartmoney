import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useCreateUserCategory } from '@/hooks/useCategories'
import { cn } from '@/utils/cn'

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  defaultType?: 'expense' | 'income'
  onCreated?: (categoryId: string) => void
}

// Common emoji icons for categories
const EMOJI_OPTIONS = [
  '📁', '🏠', '🍽️', '🚗', '💡', '📱', '🎬', '🛍️', '🏥', '📦',
  '💰', '🎁', '📈', '💼', '🔄', '✈️', '🎓', '💳', '🏦', '🎮',
  '☕', '🍕', '🚌', '⛽', '💊', '🏋️', '🐕', '👶', '💅', '📚'
]

export function CreateCategoryModal({
  isOpen,
  onClose,
  defaultType = 'expense',
  onCreated
}: CreateCategoryModalProps) {
  const { t } = useTranslation('common')
  const createMutation = useCreateUserCategory()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [type, setType] = useState<'expense' | 'income'>(defaultType)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t('category.errors.nameRequired', 'Name is required'))
      return
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        icon,
        type,
      })
      const categoryId = `custom_${created.id}`
      onCreated?.(categoryId)
      handleClose()
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } }
      setError(axiosError.response?.data?.detail || t('category.errors.createFailed', 'Failed to create category'))
    }
  }

  const handleClose = () => {
    setName('')
    setIcon('📁')
    setType(defaultType)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4"

    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('category.createTitle', 'Create Category')}
          </h3>
          <button onClick={handleClose} className="p-2.5 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

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

          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('category.type', 'Type')}
            </label>
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={cn(
                  'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                  type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-600 dark:text-gray-300'
                )}
              >
                {t('transaction.expense', 'Expense')}
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={cn(
                  'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
                  type === 'income' ? 'bg-green-500 text-white' : 'text-gray-600 dark:text-gray-300'
                )}
              >
                {t('transaction.income', 'Income')}
              </button>
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
              disabled={createMutation.isPending}
              className="flex-1 h-10 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? '...' : t('common.create', 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
