import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { fetchUnattributedRewards, attributeReward, fetchDefiPositions } from '@/services/crypto-service'
import type { PositionReward, DefiPosition } from '@/types'

interface UnattributedRewardsCardProps {
  walletId: number
}

export function UnattributedRewardsCard({ walletId }: UnattributedRewardsCardProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: rewards = [] } = useQuery({
    queryKey: ['unattributed-rewards'],
    queryFn: fetchUnattributedRewards,
  })

  const { data: positionsData } = useQuery({
    queryKey: ['defi-positions', walletId],
    queryFn: () => fetchDefiPositions(walletId),
    enabled: !!walletId,
  })

  const attributeMutation = useMutation({
    mutationFn: ({ rewardId, positionId }: { rewardId: number; positionId: string }) =>
      attributeReward(rewardId, positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unattributed-rewards'] })
      queryClient.invalidateQueries({ queryKey: ['position-rewards'] })
    },
  })

  if (rewards.length === 0) return null

  const positions = positionsData?.positions || []

  const formatAmount = (reward: PositionReward) => {
    const amount = reward.reward_amount.toLocaleString(undefined, {
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

      <div className="space-y-3">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-md border border-yellow-100 dark:border-gray-700"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {formatAmount(reward)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(reward.claimed_at)} via {reward.source}
              </div>
            </div>

            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
              onChange={(e) => {
                if (e.target.value) {
                  attributeMutation.mutate({
                    rewardId: reward.id,
                    positionId: e.target.value,
                  })
                }
              }}
              disabled={attributeMutation.isPending}
              defaultValue=""
            >
              <option value="">{t('crypto.selectPosition', 'Select position...')}</option>
              {positions.map((pos: DefiPosition) => (
                <option key={pos.id} value={pos.id}>
                  {pos.protocol} - {pos.symbol}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
