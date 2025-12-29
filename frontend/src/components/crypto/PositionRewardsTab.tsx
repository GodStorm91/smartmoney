import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Gift, TrendingUp, Calendar } from 'lucide-react'
import { fetchPositionROI, fetchPositionRewardsList } from '@/services/crypto-service'

interface PositionRewardsTabProps {
  positionId: string
}

export function PositionRewardsTab({ positionId }: PositionRewardsTabProps) {
  const { t } = useTranslation()

  const { data: roi, isLoading: roiLoading } = useQuery({
    queryKey: ['position-roi', positionId],
    queryFn: () => fetchPositionROI(positionId),
  })

  const { data: rewards = [], isLoading: rewardsLoading } = useQuery({
    queryKey: ['position-rewards', positionId],
    queryFn: () => fetchPositionRewardsList(positionId),
  })

  const isLoading = roiLoading || rewardsLoading

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  const formatCurrency = (value: number | string | null) => {
    if (value === null) return '-'
    const num = Number(value)
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPercent = (value: number | string | null) => {
    if (value === null) return '-'
    const num = Number(value)
    const prefix = num >= 0 ? '+' : ''
    return `${prefix}${num.toFixed(2)}%`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* ROI Summary Card */}
      {roi && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('crypto.roiSummary', 'ROI Summary')}
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-green-600 dark:text-green-400">
                {t('crypto.totalRewards', 'Total Rewards')}
              </div>
              <div className="text-lg font-semibold text-green-800 dark:text-green-200">
                {formatCurrency(roi.total_rewards_usd)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                {roi.rewards_count} {t('crypto.claims', 'claims')}
              </div>
            </div>

            {roi.simple_roi_pct !== null && (
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {t('crypto.roi', 'ROI')}
                </div>
                <div className={`text-lg font-semibold ${
                  roi.simple_roi_pct >= 0
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatPercent(roi.simple_roi_pct)}
                </div>
                {roi.days_held && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {roi.days_held} {t('crypto.daysHeld', 'days')}
                  </div>
                )}
              </div>
            )}

            {roi.cost_basis_usd !== null && (
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {t('crypto.costBasis', 'Cost Basis')}
                </div>
                <div className="text-lg font-semibold text-green-800 dark:text-green-200">
                  {formatCurrency(roi.cost_basis_usd)}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm text-green-600 dark:text-green-400">
                {t('crypto.currentValue', 'Current Value')}
              </div>
              <div className="text-lg font-semibold text-green-800 dark:text-green-200">
                {formatCurrency(roi.current_value_usd)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rewards List */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4" />
          {t('crypto.claimedRewards', 'Claimed Rewards')}
        </h4>

        {rewards.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t('crypto.noRewards', 'No rewards claimed for this position yet.')}
          </div>
        ) : (
          <div className="space-y-2">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {Number(reward.reward_amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}{' '}
                    {reward.reward_token_symbol || 'tokens'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(reward.claimed_at)}
                  </div>
                </div>
                {reward.reward_usd !== null && (
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(reward.reward_usd)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      via {reward.source}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
