import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTransaction, deleteTransaction } from '@/services/transaction-service'
import { useAccounts } from '@/hooks/useAccounts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { HierarchicalCategoryPicker } from './HierarchicalCategoryPicker'
import type { Transaction } from '@/types'
import { cn } from '@/utils/cn'

interface TransactionEditModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
}

export function TransactionEditModal({
  isOpen,
  onClose,
  transaction,
}: TransactionEditModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()

  // Form state
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [displayAmount, setDisplayAmount] = useState('')
  const [currency, setCurrency] = useState('JPY')
  const [category, setCategory] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Currency options
  const currencyOptions = [
    { value: 'JPY', label: '¥ JPY' },
    { value: 'USD', label: '$ USD' },
    { value: 'VND', label: '₫ VND' },
  ]

  // Format number with thousand separators
  const formatWithSeparators = (value: string): string => {
    const num = value.replace(/[^\d]/g, '')
    if (!num) return ''
    return Number(num).toLocaleString()
  }

  // Handle amount input with formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    setAmount(raw)
    setDisplayAmount(formatWithSeparators(raw))
  }

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Transaction>) =>
      updateTransaction(transaction!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      onClose()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteTransaction(transaction!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      onClose()
    },
  })

  // Populate form when transaction changes - only on open or transaction change
  useEffect(() => {
    if (transaction && isOpen) {
      setDate(transaction.date)
      setDescription(transaction.description)
      const absAmount = Math.abs(transaction.amount).toString()
      setAmount(absAmount)
      setDisplayAmount(formatWithSeparators(absAmount))
      setCurrency(transaction.currency || 'JPY')
      setCategory(transaction.category)
      setAccountId(transaction.account_id ?? null)
      setType(transaction.type)
      setShowDeleteConfirm(false)
    }
  }, [transaction?.id, isOpen])

  // Update currency when account changes
  useEffect(() => {
    if (accountId) {
      const selectedAccount = accounts.find(a => a.id === accountId)
      if (selectedAccount?.currency) {
        setCurrency(selectedAccount.currency)
      }
    }
  }, [accountId, accounts])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue)) return

    // Get account name for source field (backward compatibility)
    const selectedAccount = accounts.find(a => a.id === accountId)
    const source = selectedAccount?.name || transaction?.source || ''

    updateMutation.mutate({
      date,
      description,
      amount: Math.round(type === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue)),
      currency,
      category: category || 'Other',
      source,
      type,
      account_id: accountId,
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  if (!isOpen || !transaction) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {t('transaction.editTitle')}
          </h2>

          {showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                {t('transaction.deleteConfirm')}
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {transaction.description}
              </p>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteMutation.isPending ? '...' : t('button.delete')}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('transaction.date')}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label={t('transaction.description')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    label={t('transaction.amount')}
                    type="text"
                    inputMode="numeric"
                    value={displayAmount}
                    onChange={handleAmountChange}
                    required
                  />
                </div>
                <div className="w-28">
                  <Select
                    label={t('transaction.currency', 'Currency')}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    options={currencyOptions}
                  />
                </div>
              </div>

              <Select
                label={t('transaction.type')}
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                options={[
                  { value: 'income', label: t('transaction.typeIncome') },
                  { value: 'expense', label: t('transaction.typeExpense') },
                ]}
              />

              {/* Category Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('transaction.category')}
                </label>
                <HierarchicalCategoryPicker
                  selected={category}
                  onSelect={(childName) => setCategory(childName)}
                  isIncome={type === 'income'}
                />
              </div>

              <Select
                label={t('account.account')}
                value={accountId?.toString() || ''}
                onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
                options={[
                  { value: '', label: t('account.selectAccount') },
                  ...accounts.map(account => ({
                    value: account.id.toString(),
                    label: account.name,
                  })),
                ]}
              />

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  {updateMutation.isPending ? '...' : t('button.save')}
                </Button>
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className={cn(
                  'w-full text-center text-sm text-red-600 hover:text-red-700',
                  'py-2 transition-colors'
                )}
              >
                {t('transaction.deleteTransaction')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
