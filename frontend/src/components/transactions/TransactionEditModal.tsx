import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTransaction, deleteTransaction } from '@/services/transaction-service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
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

  // Form state
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  // Populate form when transaction changes
  useEffect(() => {
    if (transaction && isOpen) {
      setDate(transaction.date)
      setDescription(transaction.description)
      setAmount(Math.abs(transaction.amount).toString())
      setCategory(transaction.category)
      setSource(transaction.source)
      setType(transaction.type)
      setShowDeleteConfirm(false)
    }
  }, [transaction, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue)) return

    updateMutation.mutate({
      date,
      description,
      amount: type === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue),
      category,
      source,
      type,
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
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {t('transaction.editTitle')}
          </h2>

          {showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                {t('transaction.deleteConfirm')}
              </p>
              <p className="font-medium text-gray-900">
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

              <Input
                label={t('transaction.amount')}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="1"
                required
              />

              <Select
                label={t('transaction.type')}
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                options={[
                  { value: 'income', label: t('transaction.typeIncome') },
                  { value: 'expense', label: t('transaction.typeExpense') },
                ]}
              />

              <Input
                label={t('transaction.category')}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />

              <Input
                label={t('transaction.source')}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
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
