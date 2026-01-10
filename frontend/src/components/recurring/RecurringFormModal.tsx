/**
 * RecurringFormModal - Create/edit recurring transaction
 */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { RecurringOptions } from '@/components/transactions/RecurringOptions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategoryTree } from '@/hooks/useCategories'
import type { CategoryParent } from '@/types/category'
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  type RecurringTransaction,
  type RecurringTransactionCreate,
  type RecurringSuggestion,
  type FrequencyType,
} from '@/services/recurring-service'
import { cn } from '@/utils/cn'

interface RecurringFormModalProps {
  isOpen: boolean
  onClose: () => void
  editItem?: RecurringTransaction | null
  initialSuggestion?: RecurringSuggestion | null
}

export function RecurringFormModal({ isOpen, onClose, editItem, initialSuggestion }: RecurringFormModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: accounts } = useAccounts()
  const { data: categoryTree } = useCategoryTree()

  // Flatten category tree for select options
  const flattenCategories = (parents: CategoryParent[] = []): { name: string }[] => {
    return parents.flatMap(p => [{ name: p.name }, ...p.children.map(c => ({ name: c.name }))])
  }
  const expenseCategories = flattenCategories(categoryTree?.expense)
  const incomeCategories = flattenCategories(categoryTree?.income)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [isIncome, setIsIncome] = useState(false)
  const [frequency, setFrequency] = useState<FrequencyType>('monthly')
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [intervalDays, setIntervalDays] = useState(7)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  // Reset form when modal opens/closes or editItem/initialSuggestion changes
  useEffect(() => {
    if (isOpen && editItem) {
      setDescription(editItem.description)
      setAmount(Math.abs(editItem.amount).toString())
      setCategory(editItem.category)
      setAccountId(editItem.account_id)
      setIsIncome(editItem.is_income)
      setFrequency(editItem.frequency)
      setDayOfWeek(editItem.day_of_week ?? 0)
      setDayOfMonth(editItem.day_of_month ?? 1)
      setIntervalDays(editItem.interval_days ?? 7)
      setStartDate(editItem.next_run_date)
    } else if (isOpen && initialSuggestion) {
      // Pre-fill from suggestion
      setDescription(initialSuggestion.description)
      setAmount(initialSuggestion.amount.toString())
      setCategory(initialSuggestion.category)
      setAccountId(null)
      setIsIncome(initialSuggestion.is_income)
      setFrequency(initialSuggestion.frequency as FrequencyType)
      setDayOfWeek(initialSuggestion.day_of_week ?? 0)
      setDayOfMonth(initialSuggestion.day_of_month ?? new Date().getDate())
      setIntervalDays(initialSuggestion.interval_days ?? 14)
      setStartDate(new Date().toISOString().split('T')[0])
    } else if (isOpen) {
      // Reset to defaults
      setDescription('')
      setAmount('')
      setCategory('')
      setAccountId(null)
      setIsIncome(false)
      setFrequency('monthly')
      setDayOfWeek(0)
      setDayOfMonth(new Date().getDate())
      setIntervalDays(7)
      setStartDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen, editItem, initialSuggestion])

  const createMutation = useMutation({
    mutationFn: createRecurringTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecurringTransactionCreate> }) =>
      updateRecurringTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: RecurringTransactionCreate = {
      description,
      amount: parseInt(amount, 10),
      category,
      account_id: accountId,
      is_income: isIncome,
      frequency,
      day_of_week: frequency === 'weekly' ? dayOfWeek : null,
      day_of_month: frequency === 'monthly' ? dayOfMonth : null,
      interval_days: frequency === 'custom' ? intervalDays : null,
      start_date: startDate,
    }

    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const categories = isIncome ? incomeCategories : expenseCategories
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal - allows vertical scroll */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editItem ? t('recurring.edit') : t('recurring.add')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.type')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsIncome(false)}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
                  !isIncome
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                )}
              >
                {t('transaction.expense')}
              </button>
              <button
                type="button"
                onClick={() => setIsIncome(true)}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
                  isIncome
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                )}
              >
                {t('transaction.income')}
              </button>
            </div>
          </div>

          {/* Description */}
          <Input
            label={t('transaction.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('recurring.descriptionPlaceholder', 'e.g., Monthly rent')}
            required
          />

          {/* Amount */}
          <Input
            label={t('transaction.amount')}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="1"
            required
          />

          {/* Category */}
          <Select
            label={t('transaction.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: '', label: t('transaction.selectCategory') },
              ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
            ]}
            required
          />

          {/* Account */}
          <Select
            label={t('transaction.account')}
            value={accountId?.toString() ?? ''}
            onChange={(e) => setAccountId(e.target.value ? parseInt(e.target.value, 10) : null)}
            options={[
              { value: '', label: t('transaction.selectAccount', 'Select account (optional)') },
              ...(accounts?.map((acc) => ({ value: acc.id.toString(), label: acc.name })) ?? []),
            ]}
          />

          {/* Frequency Options */}
          <RecurringOptions
            frequency={frequency}
            setFrequency={setFrequency}
            dayOfWeek={dayOfWeek}
            setDayOfWeek={setDayOfWeek}
            dayOfMonth={dayOfMonth}
            setDayOfMonth={setDayOfMonth}
            intervalDays={intervalDays}
            setIntervalDays={setIntervalDays}
          />

          {/* Start Date */}
          <Input
            label={t('recurring.startDate')}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('button.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? t('button.saving', 'Saving...') : t('button.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
