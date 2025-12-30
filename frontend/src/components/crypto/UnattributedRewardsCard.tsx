import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckSquare, Square, CheckCircle2 } from 'lucide-react'
import { fetchUnattributedRewards, batchAttributeRewards, fetchDefiPositions } from '@/services/crypto-service'
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

  if (rewards.length === 0) return null

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
    if (selectedIds.size === rewards.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rewards.map((r) => r.id)))
    }
  }

  const handleBatchAssign = () => {
    if (selectedIds.size === 0 || !batchPositionId) return
    batchMutation.mutate({
      rewardIds: Array.from(selectedIds),
      positionId: batchPositionId,
    })
  }

  const allSelected = rewards.length > 0 && selectedIds.size === rewards.length
  const someSelected = selectedIds.size > 0

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
          {t('crypto.unattributedRewards', { count: rewards.length })}
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
          {allSelected ? t('common.deselectAll', 'Deselect All') : t('common.selectAll', 'Select All')}
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
              ? t('common.assigning', 'Assigning...')
              : t('crypto.assignSelected', 'Assign {{count}} Selected', { count: selectedIds.size })}
          </button>
        </div>
      </div>

      {/* Rewards List with Checkboxes */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {rewards.map((reward) => (
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
              </div>
            </div>
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
