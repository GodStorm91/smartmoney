import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

interface BulkRecategorizeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (category: string) => void
  selectedCount: number
  isLoading: boolean
}

export function BulkRecategorizeModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isLoading
}: BulkRecategorizeModalProps) {
  const { t } = useTranslation('common')
  const [category, setCategory] = useState('')

  const categoryOptions = [
    { value: '', label: t('transactions.selectCategory', 'Select category...') },
    { value: '食費', label: t('category.food', 'Food') },
    { value: '住宅', label: t('category.housing', 'Housing') },
    { value: '交通', label: t('category.transport', 'Transport') },
    { value: '娯楽', label: t('category.entertainment', 'Entertainment') },
    { value: '通信', label: t('category.communication', 'Communication') },
    { value: '日用品', label: t('category.daily', 'Daily Necessities') },
    { value: '医療', label: t('category.medical', 'Medical') },
    { value: '教育', label: t('category.education', 'Education') },
    { value: 'その他', label: t('category.other', 'Other') },
  ]

  const handleConfirm = () => {
    if (category) {
      onConfirm(category)
      setCategory('')
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4"

    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 w-[calc(100%-2rem)] max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('transactions.recategorizeTitle', 'Change Category')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('transactions.recategorizeDescription', 'Update category for {{count}} transactions', { count: selectedCount })}
        </p>

        <Select
          label={t('transactions.newCategory', 'New Category')}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categoryOptions}
        />

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('button.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!category || isLoading}
            className="flex-1"
          >
            {isLoading ? t('button.saving', 'Saving...') : t('button.apply', 'Apply')}
          </Button>
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  return null
}
