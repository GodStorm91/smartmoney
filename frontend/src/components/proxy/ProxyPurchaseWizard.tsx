import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X, ArrowRight, ArrowLeft, ShoppingCart } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { createProxyPurchase } from '@/services/proxy-service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

interface ProxyPurchaseWizardProps {
  isOpen: boolean
  onClose: () => void
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

export function ProxyPurchaseWizard({ isOpen, onClose }: ProxyPurchaseWizardProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const { data: exchangeRates } = useExchangeRates()

  // Wizard step (1 or 2)
  const [step, setStep] = useState(1)

  // Step 1: Purchase Details
  const [clientAccountId, setClientAccountId] = useState<number | null>(null)
  const [item, setItem] = useState('')
  const [cost, setCost] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null)
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])

  // Step 2: Pricing
  const [markupPrice, setMarkupPrice] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [notes, setNotes] = useState('')

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    // rate_to_jpy means VND per 1 JPY
    return exchangeRates.rates.VND
  }, [exchangeRates])

  // Calculate client charge and profit
  const costNum = parseNumber(cost)
  const markupNum = parseNumber(markupPrice)
  const rateNum = parseFloat(exchangeRate) || systemVndRate
  const clientChargeVnd = markupNum * rateNum
  const profitJpy = markupNum - costNum
  const profitPercent = costNum > 0 ? ((profitJpy / costNum) * 100).toFixed(1) : '0'

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setClientAccountId(null)
      setItem('')
      setCost('')
      setPaymentAccountId(null)
      setPurchaseDate(new Date().toISOString().split('T')[0])
      setMarkupPrice('')
      setExchangeRate(systemVndRate.toFixed(1))
      setNotes('')
      setErrors({})
    }
  }, [isOpen, systemVndRate])

  // Pre-fill exchange rate when system rate changes
  useEffect(() => {
    if (!exchangeRate && systemVndRate) {
      setExchangeRate(systemVndRate.toFixed(1))
    }
  }, [systemVndRate])

  // Validate step 1
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!clientAccountId) newErrors.client = t('proxy.errors.clientRequired')
    if (!item.trim()) newErrors.item = t('proxy.errors.itemRequired')
    if (!cost || parseNumber(cost) <= 0) newErrors.cost = t('proxy.errors.costRequired')
    if (!paymentAccountId) newErrors.payment = t('proxy.errors.paymentRequired')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Validate step 2
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!markupPrice || parseNumber(markupPrice) <= 0) {
      newErrors.markup = t('proxy.errors.markupRequired')
    }
    if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
      newErrors.rate = t('proxy.errors.rateRequired')
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle next step
  const handleNext = () => {
    if (validateStep1()) {
      // Pre-fill markup with cost if empty
      if (!markupPrice) {
        setMarkupPrice(cost)
      }
      setStep(2)
    }
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createProxyPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['proxy-outstanding'] })
      onClose()
    },
  })

  // Handle submit
  const handleSubmit = () => {
    if (!validateStep2()) return

    createMutation.mutate({
      client_account_id: clientAccountId!,
      item: item.trim(),
      cost: parseNumber(cost),
      payment_account_id: paymentAccountId!,
      markup_price: parseNumber(markupPrice),
      exchange_rate: parseFloat(exchangeRate),
      purchase_date: purchaseDate,
      notes: notes.trim() || undefined,
    })
  }

  // Get selected client name
  const selectedClient = clientAccounts.find(a => a.id === clientAccountId)

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-hidden"

    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">{t('proxy.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2.5 -mr-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>{t('proxy.step', { current: step, total: 2 })}</span>
            <span>•</span>
            <span>{step === 1 ? t('proxy.step1Title') : t('proxy.step2Title')}</span>
          </div>
          <div className="flex gap-1">
            <div className={cn('h-1 flex-1 rounded', step >= 1 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700')} />
            <div className={cn('h-1 flex-1 rounded', step >= 2 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700')} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {step === 1 ? (
            /* Step 1: Purchase Details */
            <div className="space-y-4">
              {/* Client */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('proxy.client')} *</label>
                <select
                  value={clientAccountId || ''}
                  onChange={e => setClientAccountId(Number(e.target.value) || null)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700',
                    errors.client ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
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

              {/* Item */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('proxy.item')} *</label>
                <Input
                  value={item}
                  onChange={e => setItem(e.target.value)}
                  placeholder={t('proxy.itemPlaceholder')}
                  className={errors.item ? 'border-red-500' : ''}
                />
                {errors.item && <p className="text-red-500 text-xs mt-1">{errors.item}</p>}
              </div>

              {/* Cost */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('proxy.cost')} *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <Input
                    value={cost}
                    onChange={e => setCost(formatWithCommas(e.target.value))}
                    placeholder="1,000"
                    className={cn('pl-8', errors.cost ? 'border-red-500' : '')}
                    inputMode="numeric"
                  />
                </div>
                {errors.cost && <p className="text-red-500 text-xs mt-1">{errors.cost}</p>}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('proxy.paymentMethod')} *</label>
                <select
                  value={paymentAccountId || ''}
                  onChange={e => setPaymentAccountId(Number(e.target.value) || null)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700',
                    errors.payment ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  )}
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

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('proxy.purchaseDate')}</label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>
          ) : (
            /* Step 2: Pricing */
            <div className="space-y-4">
              {/* Summary card */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span>📦</span>
                  <span className="font-medium">{item}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span>💰</span>
                  <span>{t('proxy.yourCost')}: ¥{cost}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>👤</span>
                  <span>{t('proxy.client')}: {selectedClient?.name.replace('Receivable: ', '')}</span>
                </div>
              </div>

              {/* Markup Price */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('proxy.markupPrice')} *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <Input
                    value={markupPrice}
                    onChange={e => setMarkupPrice(formatWithCommas(e.target.value))}
                    placeholder="1,200"
                    className={cn('pl-8', errors.markup ? 'border-red-500' : '')}
                    inputMode="numeric"
                  />
                </div>
                {errors.markup && <p className="text-red-500 text-xs mt-1">{errors.markup}</p>}
                <div className="flex gap-2 mt-2">
                  {[10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setMarkupPrice(formatWithCommas(String(Math.round(costNum * (1 + pct / 100)))))}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Exchange Rate */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('proxy.exchangeRate')}</label>
                <div className="relative">
                  <Input
                    value={exchangeRate}
                    onChange={e => setExchangeRate(e.target.value)}
                    placeholder="170"
                    className={errors.rate ? 'border-red-500' : ''}
                    inputMode="decimal"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">VND/JPY</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('proxy.currentRate')}: {systemVndRate.toFixed(1)} VND/JPY
                </p>
                {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
              </div>

              {/* Summary */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('proxy.clientPays')}:</span>
                  <span className="font-bold">₫{clientChargeVnd.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('proxy.yourProfit')}:</span>
                  <span className={cn('font-bold', profitJpy >= 0 ? 'text-green-600' : 'text-red-600')}>
                    ¥{profitJpy.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('proxy.profitMargin')}:</span>
                  <span className="font-medium">{profitPercent}%</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('proxy.notes')}</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('proxy.notesPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          {step === 1 ? (
            <>
              <Button variant="secondary" onClick={onClose}>{t('button.cancel')}</Button>
              <Button onClick={handleNext} disabled={clientAccounts.length === 0}>
                {t('button.next')} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> {t('button.back')}
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? t('button.creating') : t('proxy.createPurchase')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
