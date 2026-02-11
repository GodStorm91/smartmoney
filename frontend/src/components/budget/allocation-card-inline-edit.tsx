import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'

interface AllocationInlineEditProps {
  currentAmount: number
  onSave: (newAmount: number) => void
  onCancel: () => void
}

export function AllocationInlineEdit({ currentAmount, onSave, onCancel }: AllocationInlineEditProps) {
  const { t } = useTranslation('common')
  const inputRef = useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = useState(currentAmount.toLocaleString())

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const formatWithCommas = (value: string): string => {
    const num = value.replace(/[^\d]/g, '')
    if (!num) return ''
    return parseInt(num, 10).toLocaleString()
  }

  const parseValue = (value: string): number =>
    parseInt(value.replace(/[^\d]/g, ''), 10) || 0

  const handleSave = () => {
    const newAmount = parseValue(editValue)
    if (newAmount !== currentAmount) onSave(newAmount)
    else onCancel()
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={editValue}
        onChange={(e) => setEditValue(formatWithCommas(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          else if (e.key === 'Escape') onCancel()
        }}
        className="w-28 text-right text-lg font-bold border-2 border-primary-400 rounded px-2 py-1 dark:bg-gray-700 dark:border-primary-500 dark:text-gray-100 focus:outline-none focus:border-primary-500"
        aria-label={t('budget.editAmount')}
      />
      <button
        onClick={handleSave}
        className="p-1.5 bg-primary-100 dark:bg-primary-900/40 hover:bg-primary-200 dark:hover:bg-primary-900/60 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t('save')}
      >
        <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />
      </button>
      <button
        onClick={onCancel}
        className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t('cancel')}
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  )
}
