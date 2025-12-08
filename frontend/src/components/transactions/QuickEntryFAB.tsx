/**
 * Quick Entry FAB - Floating Action Button for rapid transaction entry
 *
 * Features:
 * - Calculator-style numpad for amount entry
 * - Quick category selection (icons grid)
 * - Account selector
 * - Currency selector with auto-conversion
 * - 3-4 taps to save: Amount → Category → Account → Save
 * - Always defaults to expense type
 */
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, Delete } from 'lucide-react'
import { cn } from '@/utils/cn'
import { createTransaction } from '@/services/transaction-service'
import { useAccounts } from '@/hooks/useAccounts'
import { useOfflineCreate } from '@/hooks/use-offline-mutation'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { EXPENSE_CATEGORIES } from './constants/categories'

// Currency symbols map
const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  VND: '₫',
}

// Supported currencies for quick entry
const SUPPORTED_CURRENCIES = ['JPY', 'USD', 'VND'] as const
type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

// Numpad keys
const NUMPAD_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '00', '0', 'DEL',
]

type Step = 'closed' | 'amount' | 'category' | 'account'

export function QuickEntryFAB() {
  const { t } = useTranslation('common')
  const { data: accounts } = useAccounts()
  const rates = useRatesMap()

  const [step, setStep] = useState<Step>('closed')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [inputCurrency, setInputCurrency] = useState<SupportedCurrency>('JPY')

  // Get selected account
  const selectedAccount = accounts?.find(a => a.id === accountId)

  // Set default account and currency when accounts load
  useEffect(() => {
    if (accounts?.length && !accountId) {
      setAccountId(accounts[0].id)
      // Default input currency to first account's currency
      const firstAccountCurrency = accounts[0].currency as SupportedCurrency
      if (SUPPORTED_CURRENCIES.includes(firstAccountCurrency)) {
        setInputCurrency(firstAccountCurrency)
      }
    }
  }, [accounts, accountId])

  // Update input currency when account changes
  useEffect(() => {
    if (selectedAccount) {
      const accountCurrency = selectedAccount.currency as SupportedCurrency
      if (SUPPORTED_CURRENCIES.includes(accountCurrency)) {
        setInputCurrency(accountCurrency)
      }
    }
  }, [selectedAccount])

  // Get currency symbol for input
  const currencySymbol = CURRENCY_SYMBOLS[inputCurrency] || inputCurrency

  // Calculate converted amount when currencies differ
  const convertedAmount = useMemo(() => {
    if (!amount || !selectedAccount) return null

    const accountCurrency = selectedAccount.currency
    if (inputCurrency === accountCurrency) return null

    const inputValue = parseInt(amount)
    if (isNaN(inputValue)) return null

    // Convert: input currency → account currency
    // rates are relative to JPY (e.g., USD: 150 means 1 USD = 150 JPY)
    const inputRate = rates[inputCurrency] || 1 // JPY = 1
    const accountRate = rates[accountCurrency] || 1

    // Convert input to JPY first, then to account currency
    const inJPY = inputValue * inputRate
    const converted = Math.round(inJPY / accountRate)

    return {
      value: converted,
      formatted: converted.toLocaleString(),
      currency: accountCurrency,
      symbol: CURRENCY_SYMBOLS[accountCurrency] || accountCurrency
    }
  }, [amount, inputCurrency, selectedAccount, rates])

  // Offline-aware mutation
  const createMutation = useOfflineCreate(
    createTransaction,
    'transaction',
    [['transactions'], ['analytics']]
  )

  // Format amount with commas
  const formattedAmount = amount
    ? parseInt(amount).toLocaleString()
    : '0'

  // Handle numpad key press
  const handleKeyPress = (key: string) => {
    if (key === 'DEL') {
      setAmount(prev => prev.slice(0, -1))
    } else {
      // Limit to reasonable amount (10 digits)
      if (amount.length < 10) {
        setAmount(prev => prev + key)
      }
    }
  }

  // Handle category selection
  const handleCategorySelect = (catId: string) => {
    setCategoryId(catId)
    // If only one account, skip to save
    if (accounts?.length === 1) {
      handleSave(catId)
    } else {
      setStep('account')
    }
  }

  // Handle account selection and save
  const handleAccountSelect = (accId: number) => {
    setAccountId(accId)
    handleSave(categoryId, accId)
  }

  // Save transaction
  const handleSave = async (catId?: string, accId?: number) => {
    const finalCategoryId = catId || categoryId
    const finalAccountId = accId || accountId

    const selectedCategory = EXPENSE_CATEGORIES.find(c => c.id === finalCategoryId)
    const account = accounts?.find(a => a.id === finalAccountId)

    if (!amount || !selectedCategory || !account) return

    // Use converted amount if currencies differ, otherwise use input amount
    const finalAmount = convertedAmount?.value ?? parseInt(amount)

    try {
      await createMutation.mutateAsync({
        date: new Date().toISOString().split('T')[0],
        description: selectedCategory.value, // Use category as description
        amount: -finalAmount, // Negative for expense
        category: selectedCategory.value,
        source: account.name,
        type: 'expense',
      })

      // Reset and close
      resetForm()
    } catch {
      // Error handled by mutation
    }
  }

  // Reset form state
  const resetForm = () => {
    setStep('closed')
    setAmount('')
    setCategoryId('')
    // Reset currency to default (will be set by account effect)
  }

  // Open quick entry
  const handleOpen = () => {
    setStep('amount')
    setAmount('')
    setCategoryId('')
  }

  // Close quick entry
  const handleClose = () => {
    resetForm()
  }

  // Proceed to next step
  const handleNext = () => {
    if (step === 'amount' && amount) {
      setStep('category')
    }
  }

  // Go back
  const handleBack = () => {
    if (step === 'category') {
      setStep('amount')
    } else if (step === 'account') {
      setStep('category')
    }
  }

  // Closed state - show FAB
  if (step === 'closed') {
    return (
      <button
        onClick={handleOpen}
        className={cn(
          'fixed bottom-20 right-4 z-40',
          'w-14 h-14 rounded-full',
          'bg-gradient-to-r from-blue-500 to-purple-500',
          'hover:from-blue-600 hover:to-purple-600',
          'text-white shadow-lg',
          'flex items-center justify-center',
          'transition-all hover:scale-110',
          'md:bottom-6'
        )}
        aria-label={t('quickEntry.add', 'Quick Add')}
      >
        <Plus size={28} />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose}>
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl',
          'transform transition-transform duration-300',
          'max-h-[85vh] overflow-hidden'
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={step === 'amount' ? handleClose : handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {step === 'amount' && t('quickEntry.enterAmount', 'Enter Amount')}
            {step === 'category' && t('quickEntry.selectCategory', 'Select Category')}
            {step === 'account' && t('quickEntry.selectAccount', 'Select Account')}
          </h3>
          <div className="w-9" /> {/* Spacer */}
        </div>

        {/* Amount Entry */}
        {step === 'amount' && (
          <div className="p-4">
            {/* Currency Selector Pills */}
            <div className="flex justify-center gap-2 mb-4">
              {SUPPORTED_CURRENCIES.map((currency) => (
                <button
                  key={currency}
                  onClick={() => setInputCurrency(currency)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    inputCurrency === currency
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {CURRENCY_SYMBOLS[currency]} {currency}
                </button>
              ))}
            </div>

            {/* Amount Display */}
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 font-numbers">
                {currencySymbol}{formattedAmount}
              </div>
              {/* Conversion Preview */}
              {convertedAmount && (
                <div className="text-lg text-blue-500 dark:text-blue-400 mt-2 font-numbers">
                  ≈ {convertedAmount.symbol}{convertedAmount.formatted}
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t('quickEntry.expense', 'Expense')}
              </p>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {NUMPAD_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={cn(
                    'h-14 rounded-xl text-xl font-medium transition-colors',
                    key === 'DEL'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {key === 'DEL' ? <Delete size={20} className="mx-auto" /> : key}
                </button>
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              disabled={!amount}
              className={cn(
                'w-full h-14 mt-4 rounded-xl font-medium text-white transition-all',
                amount
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              )}
            >
              {t('common.next', 'Next')}
            </button>
          </div>
        )}

        {/* Category Selection */}
        {step === 'category' && (
          <div className="p-4">
            {/* Amount reminder with conversion */}
            <div className="text-center py-2 mb-4">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-numbers">
                {currencySymbol}{formattedAmount}
              </span>
              {convertedAmount && (
                <span className="text-lg text-blue-500 dark:text-blue-400 ml-2 font-numbers">
                  → {convertedAmount.symbol}{convertedAmount.formatted}
                </span>
              )}
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-3 gap-3">
              {EXPENSE_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={cn(
                    'flex flex-col items-center p-4 rounded-xl transition-all',
                    'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
                    'active:scale-95'
                  )}
                >
                  <span className="text-2xl mb-1">{category.icon}</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300 text-center">
                    {t(category.labelKey, category.value)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Account Selection */}
        {step === 'account' && (
          <div className="p-4">
            {/* Amount + Category reminder with conversion */}
            <div className="text-center py-2 mb-4">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-numbers">
                {currencySymbol}{formattedAmount}
              </span>
              {convertedAmount && (
                <span className="text-lg text-blue-500 dark:text-blue-400 ml-2 font-numbers">
                  → {convertedAmount.symbol}{convertedAmount.formatted}
                </span>
              )}
              <span className="ml-2 text-gray-500">
                {EXPENSE_CATEGORIES.find(c => c.id === categoryId)?.icon}
              </span>
            </div>

            {/* Account List */}
            <div className="space-y-2">
              {accounts?.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-xl transition-all',
                    'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
                    'active:scale-[0.98]'
                  )}
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {account.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {CURRENCY_SYMBOLS[account.currency] || account.currency}
                  </span>
                </button>
              ))}
            </div>

            {/* Saving indicator */}
            {createMutation.isPending && (
              <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                <span>{t('common.saving', 'Saving...')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
