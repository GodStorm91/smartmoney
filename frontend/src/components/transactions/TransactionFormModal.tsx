import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/utils/cn'
import { createTransaction } from '@/services/transaction-service'
import { useAccounts } from '@/hooks/useAccounts'
import { CategoryGrid } from './CategoryGrid'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './constants/categories'

interface TransactionFormModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TransactionFormModal({ isOpen, onClose }: TransactionFormModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: accounts } = useAccounts()

  // Form state
  const [isIncome, setIsIncome] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [source, setSource] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get current categories based on income/expense
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsIncome(false)
      setDate(new Date().toISOString().split('T')[0])
      setAmount('')
      setDescription('')
      setCategoryId('')
      setSource(accounts?.[0]?.name || '')
      setErrors({})
    }
  }, [isOpen, accounts])

  // Reset category when switching income/expense
  useEffect(() => {
    setCategoryId('')
  }, [isIncome])

  // Mutation
  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      onClose()
    },
  })

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!amount || parseInt(amount) <= 0) {
      newErrors.amount = t('transaction.errors.amountRequired', 'Amount is required')
    }
    if (!description.trim()) {
      newErrors.description = t('transaction.errors.descriptionRequired', 'Description is required')
    }
    if (!categoryId) {
      newErrors.category = t('transaction.errors.categoryRequired', 'Category is required')
    }
    if (!source) {
      newErrors.source = t('transaction.errors.sourceRequired', 'Source is required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const selectedCategory = categories.find(c => c.id === categoryId)
    const amountValue = parseInt(amount)

    await createMutation.mutateAsync({
      date,
      description: description.trim(),
      amount: isIncome ? amountValue : -amountValue,
      category: selectedCategory?.value || 'Other',
      source,
      type: isIncome ? 'income' : 'expense',
    })
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'bg-white rounded-t-2xl shadow-2xl',
          'max-h-[90vh] overflow-y-auto',
          'transform transition-transform duration-300',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4">
          <h2 className="text-xl font-semibold text-center">
            {t('transaction.addTransaction', 'Add Transaction')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-4">
          {/* Income/Expense Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setIsIncome(false)}
              className={cn(
                'flex-1 py-3 rounded-md text-sm font-medium transition-colors',
                !isIncome ? 'bg-red-500 text-white' : 'text-gray-600'
              )}
            >
              {t('transaction.expense', 'Expense')}
            </button>
            <button
              type="button"
              onClick={() => setIsIncome(true)}
              className={cn(
                'flex-1 py-3 rounded-md text-sm font-medium transition-colors',
                isIncome ? 'bg-green-500 text-white' : 'text-gray-600'
              )}
            >
              {t('transaction.income', 'Income')}
            </button>
          </div>

          {/* Date with Today button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('transaction.date', 'Date')}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 h-12 px-4 border rounded-lg text-base"
              />
              <button
                type="button"
                onClick={() => setDate(new Date().toISOString().split('T')[0])}
                className="px-4 h-12 bg-gray-100 rounded-lg text-sm font-medium"
              >
                {t('common.today', 'Today')}
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('transaction.amount', 'Amount')}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              className={cn(
                'w-full h-12 px-4 border rounded-lg text-base',
                errors.amount && 'border-red-500'
              )}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('transaction.description', 'Description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('transaction.descriptionPlaceholder', 'What was this for?')}
              className={cn(
                'w-full h-12 px-4 border rounded-lg text-base',
                errors.description && 'border-red-500'
              )}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Category Grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('transaction.category', 'Category')}
            </label>
            <CategoryGrid
              categories={categories}
              selected={categoryId}
              onSelect={setCategoryId}
            />
            {errors.category && (
              <p className="mt-1 text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Source/Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('transaction.source', 'Account')}
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={cn(
                'w-full h-12 px-4 border rounded-lg text-base bg-white',
                errors.source && 'border-red-500'
              )}
            >
              <option value="">{t('transaction.selectAccount', 'Select account')}</option>
              {accounts?.map((account) => (
                <option key={account.id} value={account.name}>
                  {account.name}
                </option>
              ))}
            </select>
            {errors.source && (
              <p className="mt-1 text-sm text-red-500">{errors.source}</p>
            )}
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 border border-gray-300 rounded-lg font-medium"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className={cn(
                'flex-1 h-12 rounded-lg font-medium text-white',
                isIncome ? 'bg-green-500' : 'bg-red-500',
                createMutation.isPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              {createMutation.isPending
                ? t('common.saving', 'Saving...')
                : t('common.save', 'Save')
              }
            </button>
          </div>

          {/* Error message */}
          {createMutation.isError && (
            <p className="text-sm text-red-500 text-center">
              {t('transaction.errors.createFailed', 'Failed to create transaction')}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
