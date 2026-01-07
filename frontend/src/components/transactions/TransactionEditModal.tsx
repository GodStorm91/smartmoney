import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, X } from 'lucide-react'
import { updateTransaction, deleteTransaction } from '@/services/transaction-service'
import { uploadReceipt, getReceiptUrl } from '@/services/receipt-service'
import { useAccounts } from '@/hooks/useAccounts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { HierarchicalCategoryPicker } from './HierarchicalCategoryPicker'
import { ReceiptViewer } from '../receipts/ReceiptViewer'
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
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [newReceiptFile, setNewReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [showReceiptViewer, setShowReceiptViewer] = useState(false)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setReceiptUrl(transaction.receipt_url || null)
      setNewReceiptFile(null)
      setReceiptPreview(null)
    }
  }, [transaction?.id, isOpen])

  // Handle receipt file selection
  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    setNewReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  // Remove receipt
  const handleRemoveReceipt = () => {
    setNewReceiptFile(null)
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview)
      setReceiptPreview(null)
    }
    setReceiptUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Update currency when account changes
  useEffect(() => {
    if (accountId) {
      const selectedAccount = accounts.find(a => a.id === accountId)
      if (selectedAccount?.currency) {
        setCurrency(selectedAccount.currency)
      }
    }
  }, [accountId, accounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue)) return

    // Get account name for source field (backward compatibility)
    const selectedAccount = accounts.find(a => a.id === accountId)
    const source = selectedAccount?.name || transaction?.source || ''

    // Upload new receipt if selected
    let finalReceiptUrl = receiptUrl
    if (newReceiptFile) {
      setIsUploadingReceipt(true)
      try {
        finalReceiptUrl = await uploadReceipt(newReceiptFile)
      } finally {
        setIsUploadingReceipt(false)
      }
    }

    updateMutation.mutate({
      date,
      description,
      amount: Math.round(type === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue)),
      currency,
      category: category || 'Other',
      source,
      type,
      account_id: accountId,
      receipt_url: finalReceiptUrl,
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !transaction) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
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

              {/* Receipt Attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('receipt.receipt', 'Receipt')}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptSelect}
                  className="hidden"
                />

                {(receiptPreview || receiptUrl) ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img
                      src={receiptPreview || getReceiptUrl(receiptUrl) || ''}
                      alt="Receipt"
                      className="w-full h-20 object-cover cursor-pointer"
                      onClick={() => !receiptPreview && setShowReceiptViewer(true)}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-500 dark:text-gray-400 rounded-lg text-sm"
                  >
                    <Camera size={16} />
                    {t('receipt.attachReceipt', 'Attach Receipt')}
                  </button>
                )}
              </div>

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
                  disabled={updateMutation.isPending || isUploadingReceipt}
                  className="flex-1"
                >
                  {isUploadingReceipt ? t('receipt.uploading', 'Uploading...') : updateMutation.isPending ? '...' : t('button.save')}
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

      {/* Receipt Viewer Modal */}
      {showReceiptViewer && receiptUrl && (
        <ReceiptViewer
          receiptUrl={receiptUrl}
          onClose={() => setShowReceiptViewer(false)}
        />
      )}
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  return null
}
