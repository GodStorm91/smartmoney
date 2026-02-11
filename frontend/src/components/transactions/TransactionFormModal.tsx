import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { createTransaction, type TransactionSuggestion } from '@/services/transaction-service'
import { createRecurringTransaction, type FrequencyType } from '@/services/recurring-service'
import { uploadReceipt, type ReceiptData } from '@/services/receipt-service'
import { useAccounts } from '@/hooks/useAccounts'
import { useOfflineCreate } from '@/hooks/use-offline-mutation'
import { toStorageAmount } from '@/utils/formatCurrency'
import { CURRENCY_SYMBOLS, formatWithCommas } from '@/utils/form-utils'
import { HierarchicalCategoryPicker } from './HierarchicalCategoryPicker'
import { BudgetInsightWidget } from './BudgetInsightWidget'
import { DescriptionAutocomplete } from './DescriptionAutocomplete'
import { RecurringOptions } from './RecurringOptions'
import { ReceiptScannerModal } from '../receipts/ReceiptScannerModal'
import { TransactionTypeToggle } from './TransactionTypeToggle'
import { AmountInput } from './AmountInput'
import { TransactionReceiptSection } from './TransactionReceiptSection'
import { useXPGain } from '@/hooks/useXPGain'

interface TransactionFormModalProps {
  isOpen: boolean
  onClose: () => void
  defaultAccountId?: number | null
}

export function TransactionFormModal({ isOpen, onClose, defaultAccountId }: TransactionFormModalProps) {
  const { t } = useTranslation('common')
  const { data: accounts } = useAccounts()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Form state
  const [isIncome, setIsIncome] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [displayAmount, setDisplayAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [parentCategory, setParentCategory] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showScanner, setShowScanner] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  // Adjustment state
  const [isAdjustment, setIsAdjustment] = useState(false)

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

  // XP Gain hook
  const { showTransactionXP } = useXPGain()

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsIncome(false)
      setDate(new Date().toISOString().split('T')[0])
      setAmount('')
      setDisplayAmount('')
      setDescription('')
      setCategory('')
      setParentCategory('')
      setAccountId(defaultAccountId ?? accounts?.[0]?.id ?? null)
      setErrors({})
      setReceiptFile(null)
      setReceiptPreview(null)
      setIsAdjustment(false)
      setIsRecurring(false)
      setFrequency('monthly')
      setDayOfWeek(0)
      setDayOfMonth(25)
      setIntervalDays(7)
      setShowMoreOptions(false)
    }
  }, [isOpen, accounts, defaultAccountId])

  // Reset category when switching income/expense
  useEffect(() => {
    setCategory('')
    setParentCategory('')
  }, [isIncome])

  // Offline-aware mutation
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

  // Handle amount change from AmountInput
  const handleAmountChange = (raw: string, display: string) => {
    setAmount(raw)
    setDisplayAmount(display)
  }

  // Handle autocomplete suggestion selection
  const handleSuggestionSelect = (suggestion: TransactionSuggestion) => {
    const amountStr = suggestion.amount.toString()
    setAmount(amountStr)
    setDisplayAmount(formatWithCommas(amountStr))
    setIsIncome(suggestion.is_income)
    if (suggestion.category) {
      setCategory(suggestion.category)
    }
  }

  // Handle receipt scan completion
  const handleScanComplete = (data: ReceiptData) => {
    if (data.amount !== null) {
      const amountStr = Math.abs(data.amount).toString()
      setAmount(amountStr)
      setDisplayAmount(formatWithCommas(amountStr))
      setIsIncome(false)
    }
    if (data.date) setDate(data.date)
    if (data.merchant) setDescription(data.merchant)
    if (data.category) setCategory(data.category)
    setShowScanner(false)
  }

  // Handle receipt file selection
  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  // Remove receipt
  const handleRemoveReceipt = () => {
    setReceiptFile(null)
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview)
      setReceiptPreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
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

    const categoryValue = category || 'Other'
    const currency = selectedAccount?.currency || 'JPY'
    const amountValue = toStorageAmount(parseInt(amount), currency)

    try {
      let receipt_url: string | undefined
      if (receiptFile) {
        setIsUploadingReceipt(true)
        try {
          receipt_url = await uploadReceipt(receiptFile)
        } finally {
          setIsUploadingReceipt(false)
        }
      }

      await createMutation.mutateAsync({
        date,
        description: description.trim(),
        amount: isIncome ? amountValue : -amountValue,
        currency,
        category: categoryValue,
        source: selectedAccount?.name || '',
        type: isIncome ? 'income' : 'expense',
        account_id: accountId,
        receipt_url,
        is_adjustment: isAdjustment,
      })

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

      showTransactionXP()
      onClose()
      toast.success(t('transaction.saved', 'Transaction saved!'))
    } catch {
      // Error handled by mutation state
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[100002] bg-black/50 flex items-end sm:items-center justify-center animate-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'w-full sm:max-w-md',
          'bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl',
          'max-h-[90vh] overflow-y-auto',
          'animate-modal-in'
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
          {/* 1. Income/Expense Toggle */}
          <TransactionTypeToggle isIncome={isIncome} onToggle={setIsIncome} />

          {/* 2. Amount Input (large, auto-focused) */}
          <AmountInput
            value={amount}
            displayValue={displayAmount}
            currencySymbol={currencySymbol}
            onChange={handleAmountChange}
            error={errors.amount}
            autoFocus
          />

          {/* 3. Description with Autocomplete */}
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

          {/* 4. Category Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('transaction.category', 'Category')}
            </label>
            <HierarchicalCategoryPicker
              selected={category}
              onSelect={(childName, parentName) => {
                setCategory(childName)
                setParentCategory(parentName)
              }}
              isIncome={isIncome}
            />
            {errors.category && (
              <p className="mt-1 text-sm text-red-500">{errors.category}</p>
            )}
            {category && !isAdjustment && (
              <BudgetInsightWidget
                parentCategory={parentCategory || category}
                transactionAmount={parseInt(amount) || 0}
                isExpense={!isIncome}
                transactionCurrency={selectedAccount?.currency || 'JPY'}
              />
            )}
          </div>

          {/* 5. Account Selector */}
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

          {/* 6. Collapsible "More Options" */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <span>{t('transaction.moreOptions', 'More Options')}</span>
              <ChevronDown
                size={18}
                className={cn(
                  'transition-transform duration-200',
                  showMoreOptions && 'rotate-180'
                )}
              />
            </button>

            {showMoreOptions && (
              <div className="space-y-4 pt-2">
                {/* Date picker */}
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
                      {t('today', 'Today')}
                    </button>
                  </div>
                </div>

                {/* Balance Adjustment Checkbox */}
                <label className="flex items-center gap-3 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={isAdjustment}
                    onChange={(e) => setIsAdjustment(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('transaction.balanceAdjustment', 'Balance adjustment')}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('transaction.balanceAdjustmentHint', "Won't count toward budget")}
                    </p>
                  </div>
                </label>

                {/* Recurring Toggle */}
                <div>
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

                {/* Receipt Actions */}
                <TransactionReceiptSection
                  onScanClick={() => setShowScanner(true)}
                  receiptPreview={receiptPreview}
                  onReceiptSelect={handleReceiptSelect}
                  onRemoveReceipt={handleRemoveReceipt}
                  fileInputRef={fileInputRef}
                />
              </div>
            )}
          </div>

          {/* Submit buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12"
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || recurringMutation.isPending || isUploadingReceipt}
              className={cn(
                'flex-1 h-12',
                isRecurring ? 'bg-blue-500 hover:bg-blue-600' : (isIncome ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600')
              )}
            >
              {t('save', 'Save')}
            </Button>
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

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
