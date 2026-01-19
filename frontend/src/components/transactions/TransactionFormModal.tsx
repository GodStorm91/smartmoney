import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { createTransaction } from '@/services/transaction-service'
import { useAccounts } from '@/hooks/useAccounts'
import { useOfflineCreate } from '@/hooks/use-offline-mutation'
import { CategoryGrid } from './CategoryGrid'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './constants/categories'

interface TransactionFormModalProps {
  isOpen: boolean
  onClose: () => void
}

// Currency symbols map
const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  VND: '₫',
}

// Format number with thousand separators
function formatWithCommas(value: string): string {
  const num = value.replace(/[^\d]/g, '')
  if (!num) return ''
  return parseInt(num).toLocaleString()
}

// Parse formatted number back to raw value
function parseFormattedNumber(value: string): string {
  return value.replace(/[^\d]/g, '')
}

export function TransactionFormModal({ isOpen, onClose }: TransactionFormModalProps) {
  const { t } = useTranslation('common')
  const { data: accounts } = useAccounts()

  // Form state
  const [isIncome, setIsIncome] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [displayAmount, setDisplayAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get selected account and its currency
  const selectedAccount = useMemo(() => {
    return accounts?.find(a => a.id === accountId) || null
  }, [accounts, accountId])

  const currencySymbol = selectedAccount?.currency
    ? CURRENCY_SYMBOLS[selectedAccount.currency] || selectedAccount.currency
    : '¥'

  // Get current categories based on income/expense
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsIncome(false)
      setDate(new Date().toISOString().split('T')[0])
      setAmount('')
      setDisplayAmount('')
      setDescription('')
      setCategoryId('')
      setAccountId(accounts?.[0]?.id || null)
      setErrors({})
    }
  }, [isOpen, accounts])

  // Reset category when switching income/expense
  useEffect(() => {
    setCategoryId('')
  }, [isIncome])

  // Offline-aware mutation - queues when offline, syncs when back online
  const createMutation = useOfflineCreate(
    createTransaction,
    'transaction',
    [['transactions'], ['analytics']]
  )

  // Handle amount input with formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFormattedNumber(e.target.value)
    setAmount(rawValue)
    setDisplayAmount(formatWithCommas(rawValue))
  }

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
    if (!accountId) {
      newErrors.source = t('transaction.errors.sourceRequired', 'Account is required')
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

    try {
      await createMutation.mutateAsync({
        date,
        description: description.trim(),
        amount: isIncome ? amountValue : -amountValue,
        category: selectedCategory?.value || 'Other',
        source: selectedAccount?.name || '',
        type: isIncome ? 'income' : 'expense',
      })
      // Close modal on success (works both online and offline-queued)
      onClose()
    } catch {
      // Error handled by mutation state
    }
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
          'bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl',
          'max-h-[90vh] overflow-y-auto',
          'transform transition-transform duration-300',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4">
          <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-gray-100">
            {t('transaction.addTransaction', 'Add Transaction')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-8 space-y-4">
          {/* Income/Expense Toggle */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            <button
              type="button"
              onClick={() => setIsIncome(false)}
              className={cn(
                'flex-1 py-3 rounded-md text-sm font-medium transition-colors',
                !isIncome ? 'bg-red-500 text-white' : 'text-gray-600 dark:text-gray-300'
              )}
            >
              {t('transaction.expense', 'Expense')}
            </button>
            <button
              type="button"
              onClick={() => setIsIncome(true)}
              className={cn(
                'flex-1 py-3 rounded-md text-sm font-medium transition-colors',
                isIncome ? 'bg-green-500 text-white' : 'text-gray-600 dark:text-gray-300'
              )}
            >
              {t('transaction.income', 'Income')}
            </button>
          </div>

          {/* Date with Today button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transaction.date', 'Date')}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 h-12 px-4 border border-gray-300 rounded-lg text-base dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => setDate(new Date().toISOString().split('T')[0])}
                className="px-4 h-12 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
              >
                {t('common.today', 'Today')}
              </button>
            </div>
          </div>

          {/* Amount with currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transaction.amount', 'Amount')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-500 dark:text-gray-400">
                {currencySymbol}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={displayAmount}
                onChange={handleAmountChange}
                placeholder="0"
                className={cn(
                  'w-full h-12 pl-10 pr-4 border rounded-lg text-base text-right font-numbers',
                  'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                )}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transaction.description', 'Description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('transaction.descriptionPlaceholder', 'What was this for?')}
              className={cn(
                'w-full h-12 px-4 border rounded-lg text-base',
                'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400',
                errors.description ? 'border-red-500' : 'border-gray-300'
              )}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Category Grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transaction.source', 'Account')}
            </label>
            <select
              value={accountId || ''}
              onChange={(e) => setAccountId(e.target.value ? parseInt(e.target.value) : null)}
              className={cn(
                'w-full h-12 px-4 border rounded-lg text-base',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                errors.source ? 'border-red-500' : 'border-gray-300'
              )}
            >
              <option value="">{t('transaction.selectAccount', 'Select account')}</option>
              {accounts?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({CURRENCY_SYMBOLS[account.currency] || account.currency})
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
              className="flex-1 h-12 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300"
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
