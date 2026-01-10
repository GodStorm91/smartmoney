/**
 * ClosePositionModal - Form for closing LP positions
 * Records realized P&L and creates income transaction
 */
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Wallet, Calendar, DollarSign, AlertCircle } from 'lucide-react'
import { closePosition, ClosePositionRequest } from '@/services/position-closure-service'
import { fetchAccounts } from '@/services/account-service'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import type { GroupedPosition } from '@/components/accounts/LPPositionsSection'

interface ClosePositionModalProps {
  group: GroupedPosition
  lastSnapshotValueUsd: number
  costBasisUsd: number | null
  totalRewardsUsd: number | null
  onClose: () => void
  onSuccess: () => void
}

export function ClosePositionModal({
  group,
  lastSnapshotValueUsd,
  costBasisUsd,
  totalRewardsUsd,
  onClose,
  onSuccess,
}: ClosePositionModalProps) {
  const { t } = useTranslation('common')
  const { data: exchangeRates } = useExchangeRates()
  const usdToJpyRate = exchangeRates?.rates?.USD || 150
  const queryClient = useQueryClient()

  // Form state
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 16))
  const [exitValueUsd, setExitValueUsd] = useState(lastSnapshotValueUsd)
  const [exitValueJpy, setExitValueJpy] = useState(
    Math.round(lastSnapshotValueUsd * usdToJpyRate)
  )
  const [destinationAccountId, setDestinationAccountId] = useState<number | null>(null)
  const [note, setNote] = useState(`LP Exit: ${group.protocol} ${group.name}`)
  const [txHash, setTxHash] = useState('')

  // Update JPY when USD changes
  useEffect(() => {
    setExitValueJpy(Math.round(exitValueUsd * usdToJpyRate))
  }, [exitValueUsd, usdToJpyRate])

  // Fetch bank accounts
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchAccounts(),
  })
  const bankAccounts = accounts?.filter(a =>
    a.is_active && (a.type === 'bank' || a.type === 'savings')
  ) || []

  // Calculate P&L preview
  const realizedPnlUsd = costBasisUsd !== null
    ? exitValueUsd - costBasisUsd + (totalRewardsUsd || 0)
    : null
  const realizedPnlPct = costBasisUsd && realizedPnlUsd !== null
    ? (realizedPnlUsd / costBasisUsd) * 100
    : null

  // Get position ID and wallet address from first token
  const primaryToken = group.tokens[0]
  const positionId = primaryToken?.id || ''
  const walletAddress = (primaryToken as any)?.wallet_address || ''

  // Close mutation
  const closeMutation = useMutation({
    mutationFn: () => {
      if (!destinationAccountId) throw new Error(t('crypto.selectAccount', 'Select destination account'))

      const request: ClosePositionRequest = {
        exit_date: new Date(exitDate).toISOString(),
        exit_value_usd: exitValueUsd,
        exit_value_jpy: exitValueJpy,
        destination_account_id: destinationAccountId,
        note: note || undefined,
        tx_hash: txHash || undefined,
        wallet_address: walletAddress,
        chain_id: group.chain_id,
        protocol: group.protocol,
        symbol: group.name,
      }
      return closePosition(positionId, request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closed-positions'] })
      queryClient.invalidateQueries({ queryKey: ['defi-positions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      onSuccess()
      onClose()
    },
  })

  const modalContent = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('crypto.closePosition', 'Close Position')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Position info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {group.protocol} - {group.name}
            </p>
            <p className="text-xs text-gray-500">{group.chain_id.toUpperCase()}</p>
          </div>

          {/* Exit Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('crypto.exitDate', 'Exit Date')}
            </label>
            <input
              type="datetime-local"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Exit Value USD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1" />
              {t('crypto.exitValue', 'Exit Value')} (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={exitValueUsd}
              onChange={(e) => setExitValueUsd(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Exit Value JPY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('crypto.exitValue', 'Exit Value')} (JPY)
            </label>
            <input
              type="number"
              value={exitValueJpy}
              onChange={(e) => setExitValueJpy(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Destination Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Wallet className="w-4 h-4 inline mr-1" />
              {t('crypto.destinationAccount', 'Destination Account')}
            </label>
            <select
              value={destinationAccountId || ''}
              onChange={(e) => setDestinationAccountId(parseInt(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">{t('common.select', 'Select...')}</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.note', 'Note')}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* TX Hash (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              TX Hash ({t('common.optional', 'optional')})
            </label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          {/* P&L Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('crypto.pnlPreview', 'P&L Preview')}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">{t('crypto.costBasis', 'Cost Basis')}</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {costBasisUsd !== null ? `$${costBasisUsd.toFixed(2)}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t('crypto.totalRewards', 'Total Rewards')}</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {totalRewardsUsd ? `$${totalRewardsUsd.toFixed(2)}` : '$0.00'}
                </p>
              </div>
              <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-gray-500">{t('crypto.realizedPnl', 'Realized P&L')}</p>
                <p className={`text-lg font-bold ${
                  realizedPnlUsd !== null
                    ? realizedPnlUsd >= 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {realizedPnlUsd !== null
                    ? `${realizedPnlUsd >= 0 ? '+' : ''}$${realizedPnlUsd.toFixed(2)} (${realizedPnlPct?.toFixed(1)}%)`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {closeMutation.error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {(closeMutation.error as Error).message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => closeMutation.mutate()}
            disabled={!destinationAccountId || closeMutation.isPending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {closeMutation.isPending ? t('common.loading', 'Loading...') : t('crypto.confirmClose', 'Confirm Close')}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
