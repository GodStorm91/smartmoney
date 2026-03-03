/**
 * AddHoldingModal - Create a new holding asset
 * Follows the bolder modal pattern from RecurringFormModal
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createHolding } from '@/services/holding-service'
import type { AssetType, HoldingCreate } from '@/types/holding'
import { cn } from '@/utils/cn'

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'commodity', label: 'Commodity' },
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'bond', label: 'Bond' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
]

const CURRENCIES = ['JPY', 'USD', 'VND', 'EUR'] as const

interface AddHoldingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddHoldingModal({ isOpen, onClose }: AddHoldingModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = 'add-holding-title'

  // Form state
  const [assetName, setAssetName] = useState('')
  const [assetType, setAssetType] = useState<AssetType>('commodity')
  const [ticker, setTicker] = useState('')
  const [unitLabel, setUnitLabel] = useState('units')
  const [currency, setCurrency] = useState('JPY')
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
      setAssetName('')
      setAssetType('commodity')
      setTicker('')
      setUnitLabel('units')
      setCurrency('JPY')
      setNotes('')
    }
  }, [isOpen])

  const createMutation = useMutation({
    mutationFn: createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      toast.success(t('holdings.created', 'Holding created'))
      onClose()
    },
    onError: () => {
      toast.error(t('holdings.createFailed', 'Failed to create holding. Please try again.'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: HoldingCreate = {
      asset_name: assetName.trim(),
      asset_type: assetType,
      ticker: ticker.trim() || undefined,
      unit_label: unitLabel.trim() || 'units',
      currency,
      notes: notes.trim() || undefined,
    }

    createMutation.mutate(data)
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
            {t('holdings.addHolding', 'Add Holding')}
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
          {/* Asset Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.assetName', 'Asset Name')}
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder={t('holdings.assetNamePlaceholder', 'e.g., Gold (999.9)')}
              required
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            />
          </div>

          {/* Asset Type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.assetType', 'Asset Type')}
            </label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              required
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            >
              {ASSET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {t(`holdings.type.${type.value}`, type.label)}
                </option>
              ))}
            </select>
          </div>

          {/* Ticker Symbol */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.ticker', 'Ticker Symbol')}
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder={t('holdings.tickerPlaceholder', 'e.g., XAU, VOO')}
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            />
          </div>

          {/* Unit Label */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.unitLabel', 'Unit Label')}
            </label>
            <input
              type="text"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              placeholder={t('holdings.unitLabelPlaceholder', 'e.g., g, shares, oz')}
              required
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.currency', 'Currency')}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              required
              className={cn(
                'w-full h-12 px-4 border rounded-lg',
                'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                'border-gray-300',
                'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            >
              {CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              {t('holdings.notes', 'Notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn(
                'w-full px-4 py-3 border rounded-lg resize-none',
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
            <Button type="submit" loading={createMutation.isPending} className="flex-1 h-12">
              {createMutation.isPending ? t('button.saving', 'Saving...') : t('holdings.create', 'Create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
