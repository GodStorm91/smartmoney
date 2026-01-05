import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAccounts } from '@/hooks/useAccounts'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { createTransfer } from '@/services/transfer-service'
import { toStorageAmount } from '@/utils/formatCurrency'
import type { TransferCreate } from '@/types/transfer'

interface TransferFormModalProps {
  isOpen: boolean
  onClose: () => void
}

// Currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  VND: '₫',
}

// Format number with thousand separators
function formatWithCommas(value: string): string {
  const num = value.replace(/[^\d]/g, '')
  if (!num) return ''
  return parseInt(num).toLocaleString('en-US')
}

// Parse formatted number
function parseNumber(value: string): number {
  return parseInt(value.replace(/[,.\s]/g, ''), 10) || 0
}

export function TransferFormModal({ isOpen, onClose }: TransferFormModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: accounts } = useAccounts()
  const rates = useRatesMap()

  // Form state
  const [fromAccountId, setFromAccountId] = useState<number | null>(null)
  const [toAccountId, setToAccountId] = useState<number | null>(null)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get selected accounts
  const fromAccount = useMemo(
    () => accounts?.find(a => a.id === fromAccountId),
    [accounts, fromAccountId]
  )
  const toAccount = useMemo(
    () => accounts?.find(a => a.id === toAccountId),
    [accounts, toAccountId]
  )

  // Filter out selected from account from to options
  const toAccountOptions = useMemo(
    () => accounts?.filter(a => a.id !== fromAccountId) || [],
    [accounts, fromAccountId]
  )

  // Auto-calculate converted amount
  useEffect(() => {
    if (!fromAccount || !toAccount || !fromAmount || !rates) return

    const amount = parseNumber(fromAmount)
    if (amount <= 0) return

    // Same currency = same amount
    if (fromAccount.currency === toAccount.currency) {
      setToAmount(formatWithCommas(amount.toString()))
      return
    }

    // Cross-currency conversion
    const fromRate = rates[fromAccount.currency] || 1
    const toRate = rates[toAccount.currency] || 1

    // Convert: fromAmount in fromCurrency -> JPY -> toCurrency
    // rates are relative to JPY (JPY=1)
    const jpyAmount = amount / fromRate
    const converted = Math.round(jpyAmount * toRate)
    setToAmount(formatWithCommas(converted.toString()))
  }, [fromAccount, toAccount, fromAmount, rates])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFromAccountId(accounts?.[0]?.id || null)
      setToAccountId(null)
      setFromAmount('')
      setToAmount('')
      setFeeAmount('')
      setDate(new Date().toISOString().split('T')[0])
      setDescription('')
      setErrors({})
    }
  }, [isOpen, accounts])

  // Mutation
  const mutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      onClose()
    },
  })

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!fromAccountId) {
      newErrors.fromAccount = t('transfer.errors.fromRequired')
    }
    if (!toAccountId) {
      newErrors.toAccount = t('transfer.errors.toRequired')
    }
    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      newErrors.toAccount = t('transfer.errors.sameAccount')
    }
    if (!fromAmount || parseNumber(fromAmount) <= 0) {
      newErrors.fromAmount = t('transfer.errors.amountRequired')
    }
    if (!toAmount || parseNumber(toAmount) <= 0) {
      newErrors.toAmount = t('transfer.errors.amountRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    // Convert amounts to storage format (cents for decimal currencies like USD)
    const fromCurrency = fromAccount?.currency || 'JPY'
    const toCurrency = toAccount?.currency || 'JPY'

    const data: TransferCreate = {
      from_account_id: fromAccountId!,
      to_account_id: toAccountId!,
      from_amount: toStorageAmount(parseNumber(fromAmount), fromCurrency),
      to_amount: toStorageAmount(parseNumber(toAmount), toCurrency),
      fee_amount: toStorageAmount(parseNumber(feeAmount) || 0, fromCurrency),
      date,
      description: description.trim() || undefined,
    }

    // Calculate exchange rate if cross-currency
    if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
      data.exchange_rate = parseNumber(toAmount) / parseNumber(fromAmount)
    }

    mutation.mutate(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t('transfer.title')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* From Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transfer.fromAccount')}
            </label>
            <select
              value={fromAccountId || ''}
              onChange={e => setFromAccountId(e.target.value ? parseInt(e.target.value) : null)}
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                errors.fromAccount ? 'border-red-500' : 'border-gray-300'
              )}
            >
              <option value="">{t('transfer.selectAccount')}</option>
              {accounts?.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({CURRENCY_SYMBOLS[account.currency] || account.currency})
                </option>
              ))}
            </select>
            {errors.fromAccount && <p className="mt-1 text-sm text-red-500">{errors.fromAccount}</p>}
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-gray-400" />
          </div>

          {/* To Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transfer.toAccount')}
            </label>
            <select
              value={toAccountId || ''}
              onChange={e => setToAccountId(e.target.value ? parseInt(e.target.value) : null)}
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                errors.toAccount ? 'border-red-500' : 'border-gray-300'
              )}
            >
              <option value="">{t('transfer.selectAccount')}</option>
              {toAccountOptions.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({CURRENCY_SYMBOLS[account.currency] || account.currency})
                </option>
              ))}
            </select>
            {errors.toAccount && <p className="mt-1 text-sm text-red-500">{errors.toAccount}</p>}
          </div>

          {/* Amount Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* From Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('transfer.amount')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {fromAccount ? CURRENCY_SYMBOLS[fromAccount.currency] || fromAccount.currency : '¥'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fromAmount}
                  onChange={e => setFromAmount(formatWithCommas(e.target.value))}
                  className={cn(
                    'w-full h-12 pl-10 pr-4 border rounded-lg text-right',
                    'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                    errors.fromAmount ? 'border-red-500' : 'border-gray-300'
                  )}
                  placeholder="0"
                />
              </div>
              {errors.fromAmount && <p className="mt-1 text-sm text-red-500">{errors.fromAmount}</p>}
            </div>

            {/* To Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('transfer.convertedAmount')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {toAccount ? CURRENCY_SYMBOLS[toAccount.currency] || toAccount.currency : '¥'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={toAmount}
                  onChange={e => setToAmount(formatWithCommas(e.target.value))}
                  className={cn(
                    'w-full h-12 pl-10 pr-4 border rounded-lg text-right',
                    'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                    errors.toAmount ? 'border-red-500' : 'border-gray-300'
                  )}
                  placeholder="0"
                />
              </div>
              {errors.toAmount && <p className="mt-1 text-sm text-red-500">{errors.toAmount}</p>}
            </div>
          </div>

          {/* Exchange rate indicator */}
          {fromAccount && toAccount && fromAccount.currency !== toAccount.currency && fromAmount && toAmount && (
            <p className="text-sm text-gray-500 text-center">
              1 {fromAccount.currency} ≈ {(parseNumber(toAmount) / parseNumber(fromAmount)).toFixed(4)} {toAccount.currency}
            </p>
          )}

          {/* Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transfer.fee')} ({t('common.optional')})
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                {fromAccount ? CURRENCY_SYMBOLS[fromAccount.currency] || fromAccount.currency : '¥'}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={feeAmount}
                onChange={e => setFeeAmount(formatWithCommas(e.target.value))}
                className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg text-right dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="0"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transfer.date')}
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('transfer.description')} ({t('common.optional')})
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              placeholder={t('transfer.descriptionPlaceholder')}
            />
          </div>

          {/* Error */}
          {mutation.isError && (
            <p className="text-sm text-red-500 text-center">{t('transfer.error')}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className={cn(
                'flex-1 h-12 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700',
                mutation.isPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              {mutation.isPending ? t('common.saving') : t('transfer.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
