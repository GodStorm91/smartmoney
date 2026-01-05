import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Receipt, RefreshCw } from 'lucide-react'
import { cn } from '@/utils/cn'
import { createTransaction, type TransactionSuggestion } from '@/services/transaction-service'
import { createRecurringTransaction, type FrequencyType } from '@/services/recurring-service'
import { useAccounts } from '@/hooks/useAccounts'
import { useOfflineCreate } from '@/hooks/use-offline-mutation'
import { toStorageAmount } from '@/utils/formatCurrency'
import { HierarchicalCategoryPicker } from './HierarchicalCategoryPicker'
import { DescriptionAutocomplete } from './DescriptionAutocomplete'
import { RecurringOptions } from './RecurringOptions'
import { ReceiptScannerModal } from '../receipts/ReceiptScannerModal'
import type { ReceiptData } from '@/services/receipt-service'

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
  const queryClient = useQueryClient()

  // Form state
  const [isIncome, setIsIncome] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [displayAmount, setDisplayAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')  // child category name
  const [accountId, setAccountId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showScanner, setShowScanner] = useState(false)

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<FrequencyType>('monthly')
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [dayOfMonth, setDayOfMonth] = useState(25)
  const [intervalDays, setIntervalDays] = useState(7)

  // Get selected account and its currency
  const selectedAccount = useMemo(() => {
    return accounts?.find(a => a.id === accountId) || null
  }, [accounts, accountId])

  const currencySymbol = selectedAccount?.currency
    ? CURRENCY_SYMBOLS[selectedAccount.currency] || selectedAccount.currency
    : '¥'

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsIncome(false)
      setDate(new Date().toISOString().split('T')[0])
      setAmount('')
      setDisplayAmount('')
      setDescription('')
      setCategory('')
      setAccountId(accounts?.[0]?.id || null)
      setErrors({})
      // Reset recurring state
      setIsRecurring(false)
      setFrequency('monthly')
      setDayOfWeek(0)
      setDayOfMonth(25)
      setIntervalDays(7)
    }
  }, [isOpen, accounts])

  // Reset category when switching income/expense
  useEffect(() => {
    setCategory('')
  }, [isIncome])

  // Offline-aware mutation - queues when offline, syncs when back online
  const createMutation = useOfflineCreate(
    createTransaction,
    'transaction',
    [['transactions'], ['analytics']]
  )

  // Recurring transaction mutation
  const recurringMutation = useMutation({
    mutationFn: createRecurringTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
    },
  })

  // Handle amount input with formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFormattedNumber(e.target.value)
    setAmount(rawValue)
    setDisplayAmount(formatWithCommas(rawValue))
  }

  // Handle autocomplete suggestion selection - pre-fill form
  const handleSuggestionSelect = (suggestion: TransactionSuggestion) => {
    // Set amount
    const amountStr = suggestion.amount.toString()
    setAmount(amountStr)
    setDisplayAmount(formatWithCommas(amountStr))

    // Set income/expense type
    setIsIncome(suggestion.is_income)

    // Set category directly from suggestion
    if (suggestion.category) {
      setCategory(suggestion.category)
    }
  }

  // Handle receipt scan completion - pre-fill form with extracted data
  const handleScanComplete = (data: ReceiptData) => {
    // Set amount if extracted
    if (data.amount !== null) {
      const amountStr = Math.abs(data.amount).toString()
      setAmount(amountStr)
      setDisplayAmount(formatWithCommas(amountStr))
      // Receipts are almost always expenses, default to expense
      setIsIncome(false)
    }

    // Set date if extracted
    if (data.date) {
      setDate(data.date)
    }

    // Set description from merchant name
    if (data.merchant) {
      setDescription(data.merchant)
    }

    // Set category directly from receipt scan
    if (data.category) {
      setCategory(data.category)
    }

    setShowScanner(false)
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
    if (!category) {
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

    // Category is now directly the child category name
    const categoryValue = category || 'Other'
    const currency = selectedAccount?.currency || 'JPY'
    // Convert to storage format (cents for decimal currencies like USD)
    const amountValue = toStorageAmount(parseInt(amount), currency)

    try {
      // Always create the current transaction first
      await createMutation.mutateAsync({
        date,
        description: description.trim(),
        amount: isIncome ? amountValue : -amountValue,
        currency,
        category: categoryValue,
        source: selectedAccount?.name || '',
        type: isIncome ? 'income' : 'expense',
        account_id: accountId,
      })

      // If recurring is checked, also set up recurring for future transactions
      if (isRecurring) {
        await recurringMutation.mutateAsync({
          description: description.trim(),
          amount: amountValue,
          category: categoryValue,
          account_id: accountId,
          is_income: isIncome,
          frequency,
          day_of_week: frequency === 'weekly' ? dayOfWeek : null,
          day_of_month: frequency === 'monthly' ? dayOfMonth : null,
          interval_days: frequency === 'custom' ? intervalDays : null,
          start_date: date,
        })
      }
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

        {/* Scan Receipt Button */}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
          >
            <Receipt size={20} />
            {t('receipt.scanReceipt', 'Scan Receipt')}
          </button>
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

          {/* Description with Autocomplete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transaction.description', 'Description')}
            </label>
            <DescriptionAutocomplete
              value={description}
              onChange={setDescription}
              onSuggestionSelect={handleSuggestionSelect}
              placeholder={t('transaction.descriptionPlaceholder', 'What was this for?')}
              error={!!errors.description}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.category', 'Category')}
            </label>
            <HierarchicalCategoryPicker
              selected={category}
              onSelect={(childName) => setCategory(childName)}
              isIncome={isIncome}
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

          {/* Recurring Toggle */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('recurring.makeRecurring')}
              </span>
            </label>

            {isRecurring && (
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
              disabled={createMutation.isPending || recurringMutation.isPending}
              className={cn(
                'flex-1 h-12 rounded-lg font-medium text-white',
                isRecurring ? 'bg-blue-500' : (isIncome ? 'bg-green-500' : 'bg-red-500'),
                (createMutation.isPending || recurringMutation.isPending) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {(createMutation.isPending || recurringMutation.isPending)
                ? t('common.saving', 'Saving...')
                : t('common.save', 'Save')
              }
            </button>
          </div>

          {/* Error message */}
          {(createMutation.isError || recurringMutation.isError) && (
            <p className="text-sm text-red-500 text-center">
              {t('transaction.errors.createFailed', 'Failed to create transaction')}
            </p>
          )}
        </form>
      </div>

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
      />
    </div>
  )
}
