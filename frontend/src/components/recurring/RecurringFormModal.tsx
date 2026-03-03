/**
 * RecurringFormModal - Create/edit recurring transaction
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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

// Format number with thousand separators
function formatWithCommas(value: string): string {
  const num = value.replace(/[^\d]/g, '')
  if (!num) return ''
  return parseInt(num).toLocaleString('en-US')
}

// Parse formatted number back to raw integer
function parseFormattedNumber(value: string): number {
  return parseInt(value.replace(/[,.\s]/g, ''), 10) || 0
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  VND: '₫',
  EUR: '€',
  GBP: '£',
}

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
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = 'recurring-form-title'

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      modalRef.current?.focus()
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

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
  const [isTransfer, setIsTransfer] = useState(false)
  const [toAccountId, setToAccountId] = useState<number | null>(null)
  const [transferFeeAmount, setTransferFeeAmount] = useState('')
  const [frequency, setFrequency] = useState<FrequencyType>('monthly')
  const [dayOfWeek, setDayOfWeek] = useState(0)
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [intervalDays, setIntervalDays] = useState(7)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  // Derived: selected account's currency symbol
  const selectedAccount = accounts?.find(a => a.id === accountId)
  const accountCurrency = selectedAccount?.currency || 'JPY'
  const currencySymbol = CURRENCY_SYMBOLS[accountCurrency] || accountCurrency

  // Reset form when modal opens/closes or editItem/initialSuggestion changes
  useEffect(() => {
    if (isOpen && editItem) {
      setDescription(editItem.description)
      setAmount(formatWithCommas(Math.abs(editItem.amount).toString()))
      setCategory(editItem.category)
      setAccountId(editItem.account_id)
      setIsIncome(editItem.is_income)
      setIsTransfer(editItem.is_transfer)
      setToAccountId(editItem.to_account_id)
      setTransferFeeAmount(editItem.transfer_fee_amount ? formatWithCommas(editItem.transfer_fee_amount.toString()) : '')
      setFrequency(editItem.frequency)
      setDayOfWeek(editItem.day_of_week ?? 0)
      setDayOfMonth(editItem.day_of_month ?? 1)
      setIntervalDays(editItem.interval_days ?? 7)
      setStartDate(editItem.next_run_date)
    } else if (isOpen && initialSuggestion) {
      setDescription(initialSuggestion.description)
      setAmount(formatWithCommas(initialSuggestion.amount.toString()))
      setCategory(initialSuggestion.category)
      setAccountId(null)
      setIsIncome(initialSuggestion.is_income)
      setIsTransfer(false)
      setToAccountId(null)
      setTransferFeeAmount('')
      setFrequency(initialSuggestion.frequency as FrequencyType)
      setDayOfWeek(initialSuggestion.day_of_week ?? 0)
      setDayOfMonth(initialSuggestion.day_of_month ?? new Date().getDate())
      setIntervalDays(initialSuggestion.interval_days ?? 14)
      setStartDate(new Date().toISOString().split('T')[0])
    } else if (isOpen) {
      setDescription('')
      setAmount('')
      setCategory('')
      setAccountId(null)
      setIsIncome(false)
      setIsTransfer(false)
      setToAccountId(null)
      setTransferFeeAmount('')
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
      toast.success(t('recurring.created', 'Recurring transaction created'))
      onClose()
    },
    onError: () => {
      toast.error(t('recurring.createFailed', 'Failed to create. Please try again.'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecurringTransactionCreate> }) =>
      updateRecurringTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      toast.success(t('recurring.updated', 'Recurring transaction updated'))
      onClose()
    },
    onError: () => {
      toast.error(t('recurring.updateFailed', 'Failed to update. Please try again.'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedAmount = parseFormattedNumber(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error(t('recurring.invalidAmount', 'Please enter a valid amount'))
      return
    }

    const data: RecurringTransactionCreate = {
      description: description.trim(),
      amount: parsedAmount,
      category: isTransfer ? 'Transfer' : category,
      account_id: accountId,
      is_income: isTransfer ? false : isIncome,
      is_transfer: isTransfer,
      to_account_id: isTransfer ? toAccountId : null,
      transfer_fee_amount: isTransfer && transferFeeAmount ? parseFormattedNumber(transferFeeAmount) : null,
      currency: accountCurrency,
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

  const categories = isTransfer ? [] : isIncome ? incomeCategories : expenseCategories
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4" role="presentation">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-modal-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden outline-none animate-modal-in"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {editItem ? t('recurring.edit') : t('recurring.add')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('button.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('transaction.type')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsIncome(false); setIsTransfer(false) }}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
                  !isIncome && !isTransfer
                    ? 'bg-expense-100 text-expense-700 dark:bg-expense-900/40 dark:text-expense-300 shadow-sm'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-650'
                )}
              >
                {t('transaction.expense')}
              </button>
              <button
                type="button"
                onClick={() => { setIsIncome(true); setIsTransfer(false) }}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
                  isIncome && !isTransfer
                    ? 'bg-income-100 text-income-700 dark:bg-income-900/40 dark:text-income-300 shadow-sm'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-650'
                )}
              >
                {t('transaction.income')}
              </button>
              <button
                type="button"
                onClick={() => { setIsTransfer(true); setIsIncome(false) }}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5',
                  isTransfer
                    ? 'bg-net-100 text-net-700 dark:bg-net-900/40 dark:text-net-300 shadow-sm'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-650'
                )}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {t('recurring.transfer', 'Transfer')}
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('transaction.description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('recurring.descriptionPlaceholder', 'e.g., Monthly rent')}
              required
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            />
          </div>

          {/* Amount with currency symbol and comma formatting */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('transaction.amount')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium select-none">
                {currencySymbol}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatWithCommas(e.target.value))}
                placeholder="0"
                required
                className={cn(
                  'w-full h-12 pl-10 pr-4 border rounded-lg text-right font-numbers text-lg font-semibold',
                  'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                  'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
              />
            </div>
          </div>

          {/* Category (hidden for transfers — auto-set to "Transfer") */}
          {!isTransfer && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                {t('transaction.category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className={cn(
                  'w-full h-12 px-4 border rounded-lg',
                  'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                  'border-gray-300',
                  'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
              >
                <option value="">{t('transaction.selectCategory')}</option>
                {categories.map((cat) => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Account (Source for transfers) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {isTransfer ? t('recurring.fromAccount', 'From Account') : t('transaction.account')}
            </label>
            <select
              value={accountId?.toString() ?? ''}
              onChange={(e) => setAccountId(e.target.value ? parseInt(e.target.value, 10) : null)}
              required={isTransfer}
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            >
              <option value="">{t('transaction.selectAccount', 'Select account')}</option>
              {accounts?.filter(a => a.id !== toAccountId).map((acc) => (
                <option key={acc.id} value={acc.id.toString()}>
                  {acc.name} ({CURRENCY_SYMBOLS[acc.currency] || acc.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Transfer: Destination Account + Fee */}
          {isTransfer && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  {t('recurring.toAccount', 'To Account')}
                </label>
                <select
                  value={toAccountId?.toString() ?? ''}
                  onChange={(e) => setToAccountId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  required
                  className={cn(
                    'w-full h-12 px-4 border rounded-lg',
                    'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                    'border-gray-300',
                    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                  )}
                >
                  <option value="">{t('recurring.selectDestAccount', 'Select destination')}</option>
                  {accounts?.filter(a => a.id !== accountId).map((acc) => (
                    <option key={acc.id} value={acc.id.toString()}>
                      {acc.name} ({CURRENCY_SYMBOLS[acc.currency] || acc.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  {t('recurring.transferFee', 'Transfer Fee (optional)')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={transferFeeAmount}
                    onChange={(e) => setTransferFeeAmount(formatWithCommas(e.target.value))}
                    placeholder="0"
                    className={cn(
                      'w-full h-12 pl-10 pr-4 border rounded-lg text-right font-numbers',
                      'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                      'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                      'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                    )}
                  />
                </div>
              </div>
            </>
          )}

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
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('recurring.startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12">
              {t('button.cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting} className="flex-1 h-12">
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
