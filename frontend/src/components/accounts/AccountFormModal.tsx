import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateAccount, useUpdateAccount, useAccount } from '@/hooks/useAccounts'
import type { AccountType, AccountCreate, AccountUpdate, AccountWithBalance } from '@/types'
import { cn } from '@/utils/cn'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { usePrivacy } from '@/contexts/PrivacyContext'

// Helper to format number with thousand separators (supports negative)
const formatWithCommas = (value: string): string => {
  const isNegative = value.startsWith('-')
  const num = value.replace(/[^\d.]/g, '')
  const parts = num.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (isNegative ? '-' : '') + parts.join('.')
}

// Helper to parse formatted number back to raw value (preserves negative)
const parseFormattedNumber = (value: string): string => {
  const isNegative = value.startsWith('-')
  const num = value.replace(/[^\d.]/g, '')
  return (isNegative ? '-' : '') + num
}

// Get currency multiplier (JPY/VND = 1, USD = 100)
const getCurrencyMultiplier = (curr: string): number => {
  return curr === 'USD' ? 100 : 1
}

interface AccountFormModalProps {
  isOpen: boolean
  onClose: () => void
  editingAccountId?: number | null
}

export function AccountFormModal({
  isOpen,
  onClose,
  editingAccountId,
}: AccountFormModalProps) {
  const { t } = useTranslation('common')
  const createMutation = useCreateAccount()
  const updateMutation = useUpdateAccount()
  const { data: existingAccount } = useAccount(editingAccountId || 0)
  const rates = useRatesMap()
  const { isPrivacyMode } = usePrivacy()

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [initialBalance, setInitialBalance] = useState('')
  const [initialBalanceDate, setInitialBalanceDate] = useState('')
  const [currency, setCurrency] = useState('JPY')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Balance update state (for editing existing accounts)
  const [desiredCurrentBalance, setDesiredCurrentBalance] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Account types
  const accountTypes: AccountType[] = ['bank', 'cash', 'credit_card', 'investment', 'receivable', 'savings', 'other']

  // Determine if account has transactions
  const hasTransactions = existingAccount && (existingAccount as AccountWithBalance).transaction_count > 0

  // Calculate adjustment amount for display
  const calculateAdjustment = (): number | null => {
    if (!existingAccount || !desiredCurrentBalance) return null
    const multiplier = getCurrencyMultiplier(existingAccount.currency)
    const desired = parseFloat(desiredCurrentBalance) * multiplier
    const current = (existingAccount as AccountWithBalance).current_balance
    return desired - current
  }

  const adjustmentAmount = calculateAdjustment()

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingAccountId && existingAccount) {
        // Pre-fill form with existing data (edit mode)
        setName(existingAccount.name)
        setType(existingAccount.type)
        setNotes(existingAccount.notes || '')
        setCurrency(existingAccount.currency)

        // Initialize balance fields based on transaction count
        if (hasTransactions) {
          setDesiredCurrentBalance('')
          setShowConfirmation(false)
        } else {
          const multiplier = getCurrencyMultiplier(existingAccount.currency)
          setInitialBalance((existingAccount.initial_balance / multiplier).toString())
          setInitialBalanceDate(existingAccount.initial_balance_date)
        }
      } else {
        // Reset form for new account
        setName('')
        setType('bank')
        setInitialBalance('0')
        setInitialBalanceDate(new Date().toISOString().split('T')[0])
        setCurrency('JPY')
        setNotes('')
        setDesiredCurrentBalance('')
        setShowConfirmation(false)
      }
      setErrors({})
    }
  }, [isOpen, editingAccountId, existingAccount, hasTransactions])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = t('account.errors.nameRequired')
    }

    if (!editingAccountId) {
      if (!initialBalanceDate) {
        newErrors.initialBalanceDate = t('account.errors.dateRequired')
      }
    } else if (editingAccountId && !hasTransactions) {
      // Editing account with no transactions - validate initial balance fields
      if (!initialBalanceDate) {
        newErrors.initialBalanceDate = t('account.errors.dateRequired')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // For accounts with transactions, require confirmation before adjustment
    if (editingAccountId && hasTransactions && desiredCurrentBalance && !showConfirmation) {
      setShowConfirmation(true)
      return
    }

    try {
      if (editingAccountId) {
        // Update existing account
        const updateData: AccountUpdate = {
          name: name.trim(),
          type,
          notes: notes.trim() || undefined,
        }

        // Scenario 1: Account has NO transactions - update initial balance
        if (!hasTransactions && existingAccount) {
          const multiplier = getCurrencyMultiplier(existingAccount.currency)
          updateData.initial_balance = Math.round(parseFloat(initialBalance || '0') * multiplier)
          updateData.initial_balance_date = initialBalanceDate
        }

        // Scenario 2: Account HAS transactions - create adjustment transaction
        if (hasTransactions && desiredCurrentBalance && existingAccount) {
          const multiplier = getCurrencyMultiplier(existingAccount.currency)
          updateData.desired_current_balance = Math.round(parseFloat(desiredCurrentBalance) * multiplier)
        }

        await updateMutation.mutateAsync({ id: editingAccountId, data: updateData })
      } else {
        // Create new account
        const multiplier = getCurrencyMultiplier(currency)
        const createData: AccountCreate = {
          name: name.trim(),
          type,
          initial_balance: Math.round(parseFloat(initialBalance || '0') * multiplier),
          initial_balance_date: initialBalanceDate,
          currency,
          notes: notes.trim() || undefined,
        }
        await createMutation.mutateAsync(createData)
      }
      onClose()
    } catch (error: any) {
      setErrors({ submit: error.message || t('account.errors.submitFailed') })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {editingAccountId ? t('account.editAccount') : t('account.createAccount')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Account Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('account.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                errors.name ? 'border-red-500' : 'border-gray-300'
              )}
              placeholder={t('account.namePlaceholder')}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Account Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              {t('account.accountType')} <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {accountTypes.map((accountType) => (
                <option key={accountType} value={accountType}>
                  {t(`account.type.${accountType}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Balance Section - Three scenarios */}

          {/* Scenario 1: New account creation */}
          {!editingAccountId && (
            <>
              <div>
                <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('account.initialBalance')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="initialBalance"
                  value={formatWithCommas(initialBalance)}
                  onChange={(e) => setInitialBalance(parseFormattedNumber(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-numbers"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="initialBalanceDate" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('account.initialBalanceDate')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="initialBalanceDate"
                  value={initialBalanceDate}
                  onChange={(e) => setInitialBalanceDate(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    errors.initialBalanceDate ? 'border-red-500' : 'border-gray-300'
                  )}
                />
                {errors.initialBalanceDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.initialBalanceDate}</p>
                )}
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('account.currency')}
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="JPY">JPY (¥)</option>
                  <option value="USD">USD ($)</option>
                  <option value="VND">VND (₫)</option>
                </select>
              </div>
            </>
          )}

          {/* Scenario 2: Edit account with NO transactions - editable initial balance */}
          {editingAccountId && !hasTransactions && (
            <>
              <div>
                <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('account.initialBalance')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="initialBalance"
                  value={formatWithCommas(initialBalance)}
                  onChange={(e) => setInitialBalance(parseFormattedNumber(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-numbers"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="initialBalanceDate" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('account.initialBalanceDate')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="initialBalanceDate"
                  value={initialBalanceDate}
                  onChange={(e) => setInitialBalanceDate(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    errors.initialBalanceDate ? 'border-red-500' : 'border-gray-300'
                  )}
                />
                {errors.initialBalanceDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.initialBalanceDate}</p>
                )}
              </div>
            </>
          )}

          {/* Scenario 3: Edit account with transactions - reconciliation flow */}
          {editingAccountId && hasTransactions && existingAccount && (
            <>
              {/* Current Balance Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Current Balance</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrencyPrivacy(
                      (existingAccount as AccountWithBalance).current_balance,
                      existingAccount.currency,
                      rates,
                      true,
                      isPrivacyMode
                    )}
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  {(existingAccount as AccountWithBalance).transaction_count} transactions
                </p>
              </div>

              {/* Desired Balance Input */}
              <div>
                <label htmlFor="desiredBalance" className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Current Balance
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id="desiredBalance"
                  value={formatWithCommas(desiredCurrentBalance)}
                  onChange={(e) => {
                    setDesiredCurrentBalance(parseFormattedNumber(e.target.value))
                    setShowConfirmation(false) // Reset confirmation when value changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-numbers"
                  placeholder="Enter the actual balance"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the actual balance from your bank/wallet to reconcile
                </p>
              </div>

              {/* Adjustment Preview */}
              {adjustmentAmount !== null && adjustmentAmount !== 0 && (
                <div className={cn(
                  'border rounded-lg p-4',
                  adjustmentAmount > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                )}>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium',
                      adjustmentAmount > 0 ? 'text-green-900' : 'text-red-900'
                    )}>
                      Adjustment Amount
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-lg font-bold',
                        adjustmentAmount > 0 ? 'text-green-900' : 'text-red-900'
                      )}>
                        {adjustmentAmount > 0 ? '↑' : '↓'}
                      </span>
                      <span className={cn(
                        'text-lg font-bold',
                        adjustmentAmount > 0 ? 'text-green-900' : 'text-red-900'
                      )}>
                        {formatCurrencyPrivacy(
                          Math.abs(adjustmentAmount),
                          existingAccount.currency,
                          rates,
                          true,
                          isPrivacyMode
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Warning */}
              {showConfirmation && adjustmentAmount !== null && adjustmentAmount !== 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-900">Confirm Balance Adjustment</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        This will create a balance adjustment transaction of{' '}
                        <span className="font-semibold">
                          {formatCurrencyPrivacy(
                            Math.abs(adjustmentAmount),
                            existingAccount.currency,
                            rates,
                            true,
                            isPrivacyMode
                          )}
                        </span>
                        {' '}to reconcile your account balance.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              {t('account.notes')}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder={t('account.notesPlaceholder')}
            />
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {showConfirmation && (
              <button
                type="button"
                onClick={() => {
                  setShowConfirmation(false)
                  setDesiredCurrentBalance('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel Adjustment
              </button>
            )}
            {!showConfirmation && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className={cn(
                'flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                showConfirmation ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {createMutation.isPending || updateMutation.isPending
                ? t('common.saving')
                : showConfirmation
                ? 'Confirm Adjustment'
                : editingAccountId
                ? t('common.update')
                : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
