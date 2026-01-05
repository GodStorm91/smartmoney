import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X, Banknote } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { settleProxyPayment, type OutstandingClient } from '@/services/proxy-service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

interface ProxySettlementModalProps {
  isOpen: boolean
  onClose: () => void
  client: OutstandingClient | null
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

export function ProxySettlementModal({ isOpen, onClose, client }: ProxySettlementModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()

  // Selected items
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [receiveAccountId, setReceiveAccountId] = useState<number | null>(null)
  const [vndAmount, setVndAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filter non-receivable accounts for receiving payment
  const receiveAccounts = useMemo(
    () => accounts.filter(a => a.type !== 'receivable' && a.is_active),
    [accounts]
  )

  // Calculate totals from selected items
  const selectedItems = useMemo(() => {
    if (!client) return []
    return client.items.filter(item => selectedIds.has(item.transaction_id))
  }, [client, selectedIds])

  const totalJpy = selectedItems.reduce((sum, item) => sum + item.amount_jpy, 0)
  const totalVnd = selectedItems.reduce((sum, item) => sum + item.charge_vnd, 0)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && client) {
      // Select all items by default
      setSelectedIds(new Set(client.items.map(i => i.transaction_id)))
      setReceiveAccountId(null)
      setVndAmount('')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setErrors({})
    }
  }, [isOpen, client])

  // Pre-fill VND amount when selection changes
  useEffect(() => {
    if (totalVnd > 0) {
      setVndAmount(formatWithCommas(String(totalVnd)))
    }
  }, [totalVnd])

  // Toggle item selection
  const toggleItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all / none
  const selectAll = () => {
    if (client) {
      setSelectedIds(new Set(client.items.map(i => i.transaction_id)))
    }
  }
  const selectNone = () => setSelectedIds(new Set())

  // Validate
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (selectedIds.size === 0) newErrors.items = t('proxy.errors.selectItems')
    if (!receiveAccountId) newErrors.receive = t('proxy.errors.receiveRequired')
    if (!vndAmount || parseNumber(vndAmount) <= 0) newErrors.amount = t('proxy.errors.amountRequired')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Settle mutation
  const settleMutation = useMutation({
    mutationFn: settleProxyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['proxy-outstanding'] })
      onClose()
    },
  })

  // Handle submit
  const handleSubmit = () => {
    if (!validate() || !client) return

    settleMutation.mutate({
      client_account_id: client.client_id,
      transaction_ids: Array.from(selectedIds),
      receive_account_id: receiveAccountId!,
      vnd_amount: parseNumber(vndAmount),
      payment_date: paymentDate,
    })
  }

  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold">{t('proxy.settleTitle')}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Client info */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('proxy.client')}</p>
            <p className="font-semibold text-lg">{client.client_name}</p>
            <p className="text-sm text-gray-500">
              {t('proxy.outstanding')}: ¥{client.total_jpy.toLocaleString()}
            </p>
          </div>

          {/* Items selection */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">{t('proxy.selectItemsToSettle')}</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-blue-500 hover:underline">
                  {t('proxy.selectAll')}
                </button>
                <button onClick={selectNone} className="text-xs text-blue-500 hover:underline">
                  {t('proxy.selectNone')}
                </button>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
              {client.items.map(item => (
                <label
                  key={item.transaction_id}
                  className={cn(
                    'flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    'border-b border-gray-100 dark:border-gray-700 last:border-0'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.transaction_id)}
                    onChange={() => toggleItem(item.transaction_id)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.item}</p>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">¥{item.amount_jpy.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">₫{item.charge_vnd.toLocaleString()}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.items && <p className="text-red-500 text-xs mt-1">{errors.items}</p>}
          </div>

          {/* Settlement summary */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
            <div className="flex justify-between text-sm">
              <span>{t('proxy.settlementAmount')} (JPY):</span>
              <span className="font-bold">¥{totalJpy.toLocaleString()}</span>
            </div>
          </div>

          {/* Receive account */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{t('proxy.receiveTo')} *</label>
            <select
              value={receiveAccountId || ''}
              onChange={e => setReceiveAccountId(Number(e.target.value) || null)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700',
                errors.receive ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              )}
            >
              <option value="">{t('proxy.selectAccount')}</option>
              {receiveAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
            </select>
            {errors.receive && <p className="text-red-500 text-xs mt-1">{errors.receive}</p>}
          </div>

          {/* Amount received */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{t('proxy.amountReceived')} *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₫</span>
              <Input
                value={vndAmount}
                onChange={e => setVndAmount(formatWithCommas(e.target.value))}
                placeholder="544,000"
                className={cn('pl-8', errors.amount ? 'border-red-500' : '')}
                inputMode="numeric"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('proxy.expected')}: ₫{totalVnd.toLocaleString()}
            </p>
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          {/* Payment date */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('proxy.paymentDate')}</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>{t('button.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={settleMutation.isPending || selectedIds.size === 0}>
            {settleMutation.isPending ? t('button.processing') : t('proxy.confirmPayment')}
          </Button>
        </div>
      </div>
    </div>
  )
}
