import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckSquare, Square, CheckCircle2, Receipt, ExternalLink, Loader2, Check, X } from 'lucide-react'
import { fetchUnattributedRewards, batchAttributeRewards, fetchDefiPositions, createTransactionFromReward } from '@/services/crypto-service'
import type { PositionReward, DefiPosition } from '@/types'

interface UnattributedRewardsCardProps {
  walletId: number
}

export function UnattributedRewardsCard({ walletId }: UnattributedRewardsCardProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [batchPositionId, setBatchPositionId] = useState('')

  const { data: rewards = [] } = useQuery({
    queryKey: ['unattributed-rewards'],
    queryFn: fetchUnattributedRewards,
  })

  const { data: positionsData } = useQuery({
    queryKey: ['defi-positions', walletId],
    queryFn: () => fetchDefiPositions(walletId),
    enabled: !!walletId,
  })

  const batchMutation = useMutation({
    mutationFn: ({ rewardIds, positionId }: { rewardIds: number[]; positionId: string }) =>
      batchAttributeRewards(rewardIds, positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unattributed-rewards'] })
      queryClient.invalidateQueries({ queryKey: ['position-rewards'] })
      setSelectedIds(new Set())
      setBatchPositionId('')
    },
  })

  const [creatingTxForId, setCreatingTxForId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const createTxMutation = useMutation({
    mutationFn: (rewardId: number) => createTransactionFromReward(rewardId),
    onSuccess: (result) => {
      setSuccessMessage(t('crypto.transactionCreated', 'Transaction created: ${{amount}}', { amount: result.amount_usd.toFixed(2) }))
      queryClient.invalidateQueries({ queryKey: ['unattributed-rewards'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setCreatingTxForId(null)
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || t('crypto.transactionCreateError', 'Failed to create transaction'))
      setCreatingTxForId(null)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  if (rewards.length === 0) return null

  // Filter out rewards under $1
  const MIN_REWARD_THRESHOLD = 1
  const filteredRewards = rewards.filter(
    (r: PositionReward) => Number(r.reward_usd || 0) >= MIN_REWARD_THRESHOLD
  )

  // Return null if no rewards above threshold
  if (filteredRewards.length === 0) return null

  const positions = positionsData?.positions || []

  const formatAmount = (reward: PositionReward) => {
    const amount = Number(reward.reward_amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })
    return `${amount} ${reward.reward_token_symbol || 'tokens'}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRewards.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRewards.map((r) => r.id)))
    }
  }

  const allSelected = filteredRewards.length > 0 && selectedIds.size === filteredRewards.length
  const someSelected = selectedIds.size > 0

  const handleBatchAssign = () => {
    if (selectedIds.size === 0 || !batchPositionId) return
    batchMutation.mutate({
      rewardIds: Array.from(selectedIds),
      positionId: batchPositionId,
    })
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
          {t('crypto.unattributedRewards', { count: filteredRewards.length })}
        </h3>
      </div>

      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
        {t('crypto.unattributedRewardsDesc', 'These rewards need to be assigned to a position for ROI tracking.')}
      </p>

      {/* Batch Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-100 dark:border-gray-700">
        <button
          type="button"
          onClick={toggleSelectAll}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4 text-primary-600" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {allSelected ? t('deselectAll', 'Deselect All') : t('selectAll', 'Select All')}
        </button>

        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={batchPositionId}
            onChange={(e) => setBatchPositionId(e.target.value)}
            disabled={!someSelected}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{t('crypto.selectPosition', 'Select position...')}</option>
            {positions.map((pos: DefiPosition) => (
              <option key={pos.id} value={pos.id}>
                {pos.protocol} - {pos.symbol}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleBatchAssign}
            disabled={!someSelected || !batchPositionId || batchMutation.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            {batchMutation.isPending
              ? t('assigning', 'Assigning...')
              : t('crypto.assignSelected', 'Assign {{count}} Selected', { count: selectedIds.size })}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
          <Check className="h-4 w-4" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
          <X className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      {/* Rewards List with Checkboxes */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredRewards.map((reward) => (
          <div
            key={reward.id}
            onClick={() => toggleSelect(reward.id)}
            className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
              selectedIds.has(reward.id)
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                : 'bg-white dark:bg-gray-800 border-yellow-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
            }`}
          >
            <div className="flex-shrink-0">
              {selectedIds.has(reward.id) ? (
                <CheckSquare className="h-5 w-5 text-primary-600" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {formatAmount(reward)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(reward.claimed_at)} via {reward.source}
                {reward.reward_usd && (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    ≈ ${Number(reward.reward_usd).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Create Transaction Button */}
            {reward.reward_usd && reward.reward_usd > 0 && (
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {reward.transaction_id ? (
                  <a
                    href={`/transactions?id=${reward.transaction_id}`}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('crypto.viewTransaction', 'View Txn')}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingTxForId(reward.id)
                      createTxMutation.mutate(reward.id)
                    }}
                    disabled={creatingTxForId === reward.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 rounded hover:bg-primary-200 dark:hover:bg-primary-900/50 disabled:opacity-50 transition-colors"
                  >
                    {creatingTxForId === reward.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Receipt className="h-3 w-3" />
                    )}
                    {t('crypto.createTransaction', 'Create Txn')}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      {someSelected && (
        <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-gray-700 text-sm text-yellow-700 dark:text-yellow-300">
          {t('crypto.selectedRewards', '{{count}} reward(s) selected', { count: selectedIds.size })}
        </div>
      )}
    </div>
  )
}
