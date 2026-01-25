import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X, ShoppingCart, Plus } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { createProxyPurchase } from '@/services/proxy-service'
import { Button } from '@/components/ui/Button'
import { ProxyCartItemRow, type CartItem } from './ProxyCartItemRow'
import { ProxyCartTotals } from './ProxyCartTotals'
import { cn } from '@/utils/cn'

interface ProxyCartWizardProps {
  isOpen: boolean
  onClose: () => void
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// Create empty cart item
function createEmptyItem(): CartItem {
  return {
    id: generateId(),
    item: '',
    cost: '',
    markupPrice: '',
    notes: '',
  }
}

// Parse formatted number
function parseNumber(value: string): number {
  return parseInt(value.replace(/[,.\s]/g, ''), 10) || 0
}

// Get today's date in ISO format
function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function ProxyCartWizard({ isOpen, onClose }: ProxyCartWizardProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const { data: exchangeRates } = useExchangeRates()
  const lastItemRef = useRef<HTMLInputElement>(null)

  // Form state
  const [clientAccountId, setClientAccountId] = useState<number | null>(null)
  const [items, setItems] = useState<CartItem[]>([createEmptyItem()])
  const [exchangeRate, setExchangeRate] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null)
  const [purchaseDate, setPurchaseDate] = useState(todayISO())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState({ current: 0, total: 0 })

  // Filter accounts
  const clientAccounts = useMemo(
    () => accounts.filter(a => a.type === 'receivable' && a.is_active),
    [accounts]
  )
  const paymentAccounts = useMemo(
    () => accounts.filter(a => a.type !== 'receivable' && a.is_active),
    [accounts]
  )

  // Get VND rate from exchange rates
  const systemVndRate = useMemo(() => {
    if (!exchangeRates?.rates?.VND) return 170
    return exchangeRates.rates.VND
  }, [exchangeRates])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setClientAccountId(null)
      setItems([createEmptyItem()])
      setExchangeRate(systemVndRate.toFixed(1))
      setPaymentAccountId(null)
      setPurchaseDate(todayISO())
      setErrors({})
      setSubmitting(false)
      setSubmitProgress({ current: 0, total: 0 })
    }
  }, [isOpen, systemVndRate])

  // Item operations
  const updateItem = (id: string, field: keyof CartItem, value: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const deleteItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id))
    }
  }

  const addItem = () => {
    const newItem = createEmptyItem()
    setItems(prev => [...prev, newItem])
    // Focus new item after render
    setTimeout(() => lastItemRef.current?.focus(), 100)
  }

  const applyQuickMarkup = (id: string, percent: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const cost = parseNumber(item.cost)
      const markup = Math.round(cost * (1 + percent / 100))
      return { ...item, markupPrice: markup.toLocaleString('en-US') }
    }))
  }

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!clientAccountId) {
      newErrors.client = t('proxy.errors.clientRequired', 'Client is required')
    }
    if (!paymentAccountId) {
      newErrors.payment = t('proxy.errors.paymentRequired', 'Payment method is required')
    }
    if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
      newErrors.rate = t('proxy.errors.rateRequired', 'Exchange rate is required')
    }

    const validItems = items.filter(i => i.item.trim() && parseNumber(i.cost) > 0)
    if (validItems.length === 0) {
      newErrors.items = t('proxy.errors.itemsRequired', 'At least one item is required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit handler - sequential API calls
  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    const validItems = items.filter(i => i.item.trim() && parseNumber(i.cost) > 0)
    setSubmitProgress({ current: 0, total: validItems.length })

    try {
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i]
        await createProxyPurchase({
          client_account_id: clientAccountId!,
          item: item.item.trim(),
          cost: parseNumber(item.cost),
          payment_account_id: paymentAccountId!,
          markup_price: parseNumber(item.markupPrice) || parseNumber(item.cost),
          exchange_rate: parseFloat(exchangeRate),
          purchase_date: purchaseDate,
          notes: item.notes?.trim() || undefined,
        })
        setSubmitProgress({ current: i + 1, total: validItems.length })
      }

      // Invalidate queries and close
      queryClient.invalidateQueries({ queryKey: ['proxy-outstanding'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onClose()
    } catch (error) {
      console.error('Failed to create proxy purchases:', error)
      setErrors({ submit: t('proxy.errors.submitFailed', 'Failed to create purchases') })
    } finally {
      setSubmitting(false)
    }
  }

  // Get selected client name
  const selectedClient = clientAccounts.find(a => a.id === clientAccountId)

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold">{t('proxy.cartTitle', 'Proxy Cart')}</h2>
            {items.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                {items.filter(i => i.item.trim()).length} {t('proxy.items', 'items')}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            disabled={submitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Client & Payment Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('proxy.client')} *</label>
              <select
                value={clientAccountId || ''}
                onChange={e => setClientAccountId(Number(e.target.value) || null)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-sm',
                  errors.client ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
                disabled={submitting}
              >
                <option value="">{t('proxy.selectClient')}</option>
                {clientAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name.replace('Receivable: ', '')}
                  </option>
                ))}
              </select>
              {errors.client && <p className="text-red-500 text-xs mt-1">{errors.client}</p>}
              {clientAccounts.length === 0 && (
                <p className="text-amber-600 text-xs mt-1">{t('proxy.noClients')}</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('proxy.paymentMethod')} *</label>
              <select
                value={paymentAccountId || ''}
                onChange={e => setPaymentAccountId(Number(e.target.value) || null)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-sm',
                  errors.payment ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
                disabled={submitting}
              >
                <option value="">{t('proxy.selectPayment')}</option>
                {paymentAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              {errors.payment && <p className="text-red-500 text-xs mt-1">{errors.payment}</p>}
            </div>
          </div>

          {/* Date & Exchange Rate Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('proxy.purchaseDate')}</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                disabled={submitting}
              />
            </div>

            {/* Exchange Rate */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('proxy.exchangeRate')}</label>
              <div className="relative">
                <input
                  value={exchangeRate}
                  onChange={e => setExchangeRate(e.target.value)}
                  placeholder="170"
                  className={cn(
                    'w-full px-3 py-2 pr-20 rounded-lg border bg-white dark:bg-gray-700 text-sm',
                    errors.rate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
                  inputMode="decimal"
                  disabled={submitting}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">VND/JPY</span>
              </div>
              {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">{t('proxy.itemList', 'Items')} *</label>
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded"
                disabled={submitting}
              >
                <Plus className="w-3 h-3" />
                {t('proxy.addItem', 'Add Item')}
              </button>
            </div>

            {errors.items && (
              <p className="text-red-500 text-xs mb-2">{errors.items}</p>
            )}

            <div className="space-y-2">
              {items.map((item, index) => (
                <ProxyCartItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onQuickMarkup={applyQuickMarkup}
                  showDelete={items.length > 1}
                  disabled={submitting}
                  inputRef={index === items.length - 1 ? lastItemRef : undefined}
                />
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <ProxyCartTotals
            items={items}
            exchangeRate={parseFloat(exchangeRate) || systemVndRate}
          />

          {/* Submit Error */}
          {errors.submit && (
            <p className="text-red-500 text-sm text-center">{errors.submit}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('button.cancel')}
          </Button>

          <div className="flex items-center gap-3">
            {submitting && (
              <span className="text-sm text-gray-500">
                {submitProgress.current}/{submitProgress.total}
              </span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || clientAccounts.length === 0}
            >
              {submitting
                ? t('proxy.creating', 'Creating...')
                : t('proxy.createPurchases', 'Create Purchases')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
