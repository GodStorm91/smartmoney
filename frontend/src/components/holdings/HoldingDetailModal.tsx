/**
 * HoldingDetailModal - View holding details, lots, and actions
 * Follows the bolder modal pattern from RecurringFormModal
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X, Trash2, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fetchHolding, deleteLot, updateHoldingPrice } from '@/services/holding-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { AddLotModal } from './AddLotModal'
import type { Holding, HoldingLot, LotType } from '@/types/holding'
import { cn } from '@/utils/cn'

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '\u00a5',
  USD: '$',
  VND: '\u20ab',
  EUR: '\u20ac',
  GBP: '\u00a3',
}

const LOT_TYPE_STYLES: Record<LotType, string> = {
  buy: 'bg-income-100 text-income-700 dark:bg-income-900/40 dark:text-income-300',
  sell: 'bg-expense-100 text-expense-700 dark:bg-expense-900/40 dark:text-expense-300',
  dividend: 'bg-net-100 text-net-700 dark:bg-net-900/40 dark:text-net-300',
}

interface HoldingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  holding: Holding
}

export function HoldingDetailModal({ isOpen, onClose, holding }: HoldingDetailModalProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { currency: settingsCurrency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = 'holding-detail-title'

  const currencySymbol = CURRENCY_SYMBOLS[holding.currency] || holding.currency
  const isNativeCurrency = holding.currency === settingsCurrency

  // Inline price edit state
  const [isEditingPrice, setIsEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState('')

  // Add lot modal state
  const [isLotModalOpen, setIsLotModalOpen] = useState(false)
  const [lotType, setLotType] = useState<'buy' | 'sell'>('buy')

  // Fetch holding with lots
  const { data: holdingDetail } = useQuery({
    queryKey: ['holding', holding.id],
    queryFn: () => fetchHolding(holding.id),
    enabled: isOpen,
  })

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isLotModalOpen) onClose()
  }, [onClose, isLotModalOpen])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      modalRef.current?.focus()
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setIsEditingPrice(false)
      setPriceInput('')
    }
  }, [isOpen])

  // Delete lot mutation
  const deleteLotMutation = useMutation({
    mutationFn: (lotId: number) => deleteLot(holding.id, lotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['holding', holding.id] })
      toast.success(t('holdings.lotDeleted', 'Transaction deleted'))
    },
    onError: () => {
      toast.error(t('holdings.lotDeleteFailed', 'Failed to delete transaction'))
    },
  })

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: (price: number) =>
      updateHoldingPrice(holding.id, price, new Date().toISOString().split('T')[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['holding', holding.id] })
      toast.success(t('holdings.priceUpdated', 'Price updated'))
      setIsEditingPrice(false)
      setPriceInput('')
    },
    onError: () => {
      toast.error(t('holdings.priceUpdateFailed', 'Failed to update price'))
    },
  })

  const handleDeleteLot = (lot: HoldingLot) => {
    const confirmed = window.confirm(
      t('holdings.confirmDeleteLot', 'Delete this transaction? This cannot be undone.')
    )
    if (confirmed) {
      deleteLotMutation.mutate(lot.id)
    }
  }

  const handlePriceSave = () => {
    const parsed = parseInt(priceInput.replace(/[,.\s]/g, ''), 10)
    if (!parsed || parsed <= 0) {
      toast.error(t('holdings.invalidPrice', 'Please enter a valid price'))
      return
    }
    updatePriceMutation.mutate(parsed)
  }

  const handleOpenLotModal = (type: 'buy' | 'sell') => {
    setLotType(type)
    setIsLotModalOpen(true)
  }

  // Format with comma separators for price input
  const formatPriceInput = (value: string): string => {
    const num = value.replace(/[^\d]/g, '')
    if (!num) return ''
    return parseInt(num).toLocaleString('en-US')
  }

  const fmtCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '---'
    return formatCurrencyPrivacy(amount, holding.currency, rates, isNativeCurrency, isPrivacyMode)
  }

  // Determine if price is stale (>7 days)
  const isPriceStale = (() => {
    if (!holding.current_price_date) return false
    const priceDate = new Date(holding.current_price_date)
    const now = new Date()
    const diffDays = (now.getTime() - priceDate.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays > 7
  })()

  // Use holdingDetail data if available, otherwise fall back to the passed holding
  const detail = holdingDetail || holding
  const lots = holdingDetail?.lots || []

  // Format date for display (MM/DD)
  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
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
          <div>
            <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {detail.asset_name}
            </h2>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">
              {t(`holdings.type.${detail.asset_type}`, detail.asset_type)}
              {detail.ticker && <> &middot; {detail.ticker}</>}
              {' '}&middot; {detail.unit_label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('button.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Total Value */}
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                {t('holdings.totalValue', 'Total Value')}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-numbers">
                {fmtCurrency(detail.current_value)}
              </p>
            </div>

            {/* Cost Basis */}
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                {t('holdings.costBasis', 'Cost Basis')}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-numbers">
                {fmtCurrency(detail.total_cost_basis)}
              </p>
            </div>

            {/* P&L */}
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                {t('holdings.pnl', 'P&L')}
              </p>
              {detail.unrealized_pnl != null ? (
                <p className={cn(
                  'text-lg font-bold font-numbers',
                  detail.unrealized_pnl >= 0
                    ? 'text-income-600 dark:text-income-400'
                    : 'text-expense-600 dark:text-expense-400'
                )}>
                  {detail.unrealized_pnl >= 0 ? '+' : ''}{fmtCurrency(detail.unrealized_pnl)}
                  {detail.pnl_percentage != null && (
                    <span className="text-sm ml-1">
                      ({detail.pnl_percentage >= 0 ? '+' : ''}{detail.pnl_percentage.toFixed(1)}%)
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-lg font-bold text-gray-400 dark:text-gray-500 font-numbers">---</p>
              )}
            </div>

            {/* Avg Cost */}
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                {t('holdings.avgCost', 'Avg Cost')}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-numbers">
                {fmtCurrency(detail.avg_cost_per_unit)}/{detail.unit_label}
              </p>
            </div>
          </div>

          {/* Current Price Row */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  {t('holdings.currentPrice', 'Current Price')}
                </p>
                {detail.current_price_per_unit != null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100 font-numbers">
                      {fmtCurrency(detail.current_price_per_unit)}/{detail.unit_label}
                    </span>
                    {detail.current_price_date && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({formatShortDate(detail.current_price_date)})
                      </span>
                    )}
                    {isPriceStale && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3" />
                        {t('holdings.stale', 'Stale')}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    {t('holdings.noPriceSet', 'No price set')}
                  </p>
                )}
              </div>
              {!isEditingPrice ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingPrice(true)
                    setPriceInput(
                      detail.current_price_per_unit
                        ? detail.current_price_per_unit.toLocaleString('en-US')
                        : ''
                    )
                  }}
                >
                  {t('holdings.updatePrice', 'Update Price')}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium text-sm select-none">
                      {currencySymbol}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceInput}
                      onChange={(e) => setPriceInput(formatPriceInput(e.target.value))}
                      placeholder="0"
                      autoFocus
                      className={cn(
                        'w-28 h-9 pl-8 pr-2 border rounded-lg text-right font-numbers text-sm',
                        'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                        'border-gray-300',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePriceSave}
                    disabled={updatePriceMutation.isPending}
                    className="p-2 text-income-600 hover:bg-income-50 dark:hover:bg-income-900/20 rounded-lg transition-colors"
                    aria-label={t('button.save', 'Save')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPrice(false)}
                    className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label={t('button.cancel')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('holdings.transactionHistory', 'Transaction History')}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenLotModal('buy')}
                >
                  + {t('holdings.buy', 'Buy')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenLotModal('sell')}
                >
                  + {t('holdings.sell', 'Sell')}
                </Button>
              </div>
            </div>

            {lots.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6 italic">
                {t('holdings.noTransactions', 'No transactions yet')}
              </p>
            ) : (
              <div className="space-y-2">
                {lots
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((lot) => (
                    <div
                      key={lot.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {/* Date */}
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12 shrink-0">
                        {formatShortDate(lot.date)}
                      </span>

                      {/* Type badge */}
                      <span className={cn(
                        'text-xs font-bold uppercase px-2 py-0.5 rounded shrink-0',
                        LOT_TYPE_STYLES[lot.type]
                      )}>
                        {t(`holdings.${lot.type}`, lot.type)}
                      </span>

                      {/* Units + price */}
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-numbers truncate">
                        {parseFloat(lot.units).toFixed(2)}{detail.unit_label}
                        <span className="text-gray-400 dark:text-gray-500 mx-1">@</span>
                        {fmtCurrency(lot.price_per_unit)}
                      </span>

                      {/* Total */}
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-numbers ml-auto shrink-0">
                        {fmtCurrency(lot.total_amount)}
                      </span>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteLot(lot)}
                        disabled={deleteLotMutation.isPending}
                        className="p-1.5 text-gray-400 hover:text-expense-500 dark:hover:text-expense-400 rounded-lg hover:bg-expense-50 dark:hover:bg-expense-900/20 transition-colors shrink-0"
                        aria-label={t('button.delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Lot Modal */}
      <AddLotModal
        isOpen={isLotModalOpen}
        onClose={() => setIsLotModalOpen(false)}
        holdingId={holding.id}
        holdingCurrency={holding.currency}
        unitLabel={holding.unit_label}
        defaultType={lotType}
      />
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
