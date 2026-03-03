/**
 * AddLotModal - Record a buy/sell/dividend transaction for a holding
 * Follows the bolder modal pattern from RecurringFormModal
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { addLot } from '@/services/holding-service'
import type { LotType, LotCreate } from '@/types/holding'
import { cn } from '@/utils/cn'

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '\u00a5',
  USD: '$',
  VND: '\u20ab',
  EUR: '\u20ac',
  GBP: '\u00a3',
}

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

interface AddLotModalProps {
  isOpen: boolean
  onClose: () => void
  holdingId: number
  holdingCurrency: string
  unitLabel: string
  defaultType?: 'buy' | 'sell' | 'dividend'
}

export function AddLotModal({
  isOpen,
  onClose,
  holdingId,
  holdingCurrency,
  unitLabel,
  defaultType = 'buy',
}: AddLotModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = 'add-lot-title'

  const currencySymbol = CURRENCY_SYMBOLS[holdingCurrency] || holdingCurrency

  // Form state
  const [lotType, setLotType] = useState<LotType>(defaultType)
  const [units, setUnits] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLotType(defaultType)
      setUnits('')
      setPricePerUnit('')
      setTotalAmount('')
      setFeeAmount('')
      setDate(new Date().toISOString().split('T')[0])
      setNotes('')
    }
  }, [isOpen, defaultType])

  // Auto-calculate total when units or price changes
  useEffect(() => {
    const parsedUnits = parseFloat(units)
    const parsedPrice = parseFormattedNumber(pricePerUnit)
    if (!isNaN(parsedUnits) && parsedUnits > 0 && parsedPrice > 0) {
      const computed = Math.round(parsedUnits * parsedPrice)
      setTotalAmount(computed.toLocaleString('en-US'))
    }
  }, [units, pricePerUnit])

  const mutation = useMutation({
    mutationFn: (data: LotCreate) => addLot(holdingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['holding', holdingId] })
      toast.success(t('holdings.lotAdded', 'Transaction recorded'))
      onClose()
    },
    onError: () => {
      toast.error(t('holdings.lotAddFailed', 'Failed to record transaction. Please try again.'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedUnits = parseFloat(units)
    if (isNaN(parsedUnits) || parsedUnits <= 0) {
      toast.error(t('holdings.invalidUnits', 'Please enter valid units'))
      return
    }

    const parsedPrice = parseFormattedNumber(pricePerUnit)
    if (!parsedPrice || parsedPrice <= 0) {
      toast.error(t('holdings.invalidPrice', 'Please enter a valid price'))
      return
    }

    const data: LotCreate = {
      type: lotType,
      date,
      units: units,
      price_per_unit: parsedPrice,
      total_amount: parseFormattedNumber(totalAmount),
      fee_amount: feeAmount ? parseFormattedNumber(feeAmount) : undefined,
      notes: notes.trim() || undefined,
    }

    mutation.mutate(data)
  }

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
            {t('holdings.addTransaction', 'Add Transaction')}
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
                onClick={() => setLotType('buy')}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
                  lotType === 'buy'
                    ? 'bg-income-100 text-income-700 dark:bg-income-900/40 dark:text-income-300 shadow-sm'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-650'
                )}
              >
                {t('holdings.buy', 'Buy')}
              </button>
              <button
                type="button"
                onClick={() => setLotType('sell')}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
                  lotType === 'sell'
                    ? 'bg-expense-100 text-expense-700 dark:bg-expense-900/40 dark:text-expense-300 shadow-sm'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-650'
                )}
              >
                {t('holdings.sell', 'Sell')}
              </button>
              <button
                type="button"
                onClick={() => setLotType('dividend')}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200',
                  lotType === 'dividend'
                    ? 'bg-net-100 text-net-700 dark:bg-net-900/40 dark:text-net-300 shadow-sm'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-650'
                )}
              >
                {t('holdings.dividend', 'Dividend')}
              </button>
            </div>
          </div>

          {/* Units */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.units', 'Units')}
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="0"
                required
                className={cn(
                  'w-full h-12 px-4 pr-16 border rounded-lg text-right font-numbers text-lg font-semibold',
                  'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                  'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium text-sm select-none">
                {unitLabel}
              </span>
            </div>
          </div>

          {/* Price per unit */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.pricePerUnit', 'Price per Unit')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium select-none">
                {currencySymbol}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(formatWithCommas(e.target.value))}
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

          {/* Total Amount (auto-calculated) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.totalAmount', 'Total Amount')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium select-none">
                {currencySymbol}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={totalAmount}
                onChange={(e) => setTotalAmount(formatWithCommas(e.target.value))}
                placeholder="0"
                className={cn(
                  'w-full h-12 pl-10 pr-4 border rounded-lg text-right font-numbers text-lg font-semibold',
                  'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                  'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
              />
            </div>
          </div>

          {/* Fee */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.fee', 'Fee (optional)')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium select-none">
                {currencySymbol}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={feeAmount}
                onChange={(e) => setFeeAmount(formatWithCommas(e.target.value))}
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

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.date', 'Date')}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.notes', 'Notes')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('holdings.notesPlaceholder', 'Optional note')}
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12">
              {t('button.cancel')}
            </Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1 h-12">
              {mutation.isPending
                ? t('button.saving', 'Saving...')
                : lotType === 'buy'
                  ? t('holdings.recordBuy', 'Record Buy')
                  : lotType === 'sell'
                    ? t('holdings.recordSell', 'Record Sell')
                    : t('holdings.recordDividend', 'Record Dividend')
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
