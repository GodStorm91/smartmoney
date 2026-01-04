import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Gift, TrendingUp, Calendar, RefreshCw, Check, Receipt, ExternalLink, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchPositionROI, scanRewards, fetchPositionRewardsList, createTransactionFromReward } from '@/services/crypto-service'
import type { PositionReward } from '@/types'

interface PositionRewardsTabProps {
  positionId: string
}

export function PositionRewardsTab({ positionId }: PositionRewardsTabProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [scanResult, setScanResult] = useState<{ scanned: number; new: number } | null>(null)
  const [showAllRewards, setShowAllRewards] = useState(false)
  const [creatingTxForId, setCreatingTxForId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: roi, isLoading } = useQuery({
    queryKey: ['position-roi', positionId],
    queryFn: () => fetchPositionROI(positionId),
  })

  const { data: rewards = [] } = useQuery({
    queryKey: ['position-rewards-list', positionId],
    queryFn: () => fetchPositionRewardsList(positionId),
  })

  const scanMutation = useMutation({
    mutationFn: () => scanRewards(90),
    onSuccess: (result) => {
      setScanResult({ scanned: result.scanned_claims, new: result.new_claims })
      queryClient.invalidateQueries({ queryKey: ['position-roi'] })
      queryClient.invalidateQueries({ queryKey: ['position-rewards-list'] })
      queryClient.invalidateQueries({ queryKey: ['unattributed-rewards'] })
      setTimeout(() => setScanResult(null), 5000)
    },
  })

  const createTxMutation = useMutation({
    mutationFn: (rewardId: number) => createTransactionFromReward(rewardId),
    onSuccess: (result) => {
      setSuccessMessage(t('crypto.transactionCreated', 'Transaction created: ${{amount}}', { amount: result.amount_usd.toFixed(2) }))
      queryClient.invalidateQueries({ queryKey: ['position-rewards-list'] })
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return null
    const num = Number(value)
    if (isNaN(num)) return null
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPercent = (value: number | string | null) => {
    if (value === null) return '-'
    const num = Number(value)
    const prefix = num >= 0 ? '+' : ''
    return `${prefix}${num.toFixed(2)}%`
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }

  const formatAmount = (amount: number) => {
    return Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <div className="space-y-4">
      {/* Scan Button */}
      <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
        <div className="text-sm text-indigo-700 dark:text-indigo-300">
          {t('crypto.scanRewardsHint', 'Scan blockchain for claimed rewards')}
        </div>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {scanMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('crypto.scanning', 'Scanning...')}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              {t('crypto.scanRewards', 'Scan Rewards')}
            </>
          )}
        </button>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
          <Check className="h-4 w-4" />
          {t('crypto.scanComplete', 'Scanned {{scanned}} claims, found {{new}} new', scanResult)}
        </div>
      )}

      {/* ROI Summary Card */}
      {roi && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('crypto.roiSummary', 'ROI Summary')}
          </h4>

          <div className="space-y-3">
            {/* Total Rewards */}
            <div>
              <div className="text-sm text-green-600 dark:text-green-400">
                {t('crypto.totalRewards', 'Total Rewards')}
              </div>
              {roi.rewards_by_token && roi.rewards_by_token.length > 0 ? (
                <div className="space-y-1">
                  {roi.rewards_by_token.map((token) => {
                    const usdValue = formatCurrency(token.amount_usd)
                    return (
                      <div key={token.symbol}>
                        <div className="text-lg font-semibold text-green-800 dark:text-green-200">
                          {formatAmount(token.amount)} {token.symbol}
                        </div>
                        {usdValue && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            ≈ {usdValue}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-lg font-semibold text-green-800 dark:text-green-200">
                  {formatCurrency(roi.total_rewards_usd) || '-'}
                </div>
              )}
              <div className="text-xs text-green-600 dark:text-green-400">
                {roi.rewards_count} {t('crypto.claims', 'claims')}
              </div>
            </div>

            {/* ROI Section - only show if cost basis exists */}
            {roi.cost_basis_usd !== null && roi.simple_roi_pct !== null && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-green-200 dark:border-green-800">
                <div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {t('crypto.costBasis', 'Cost Basis')}
                  </div>
                  <div className="text-lg font-semibold text-green-800 dark:text-green-200">
                    {formatCurrency(roi.cost_basis_usd)}
                  </div>
                </div>
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      {roi && roi.rewards_by_month && roi.rewards_by_month.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('crypto.monthlyBreakdown', 'Monthly Breakdown')}
          </h4>

          <div className="space-y-2">
            {roi.rewards_by_month.map((monthly) => {
              const usdValue = formatCurrency(monthly.amount_usd)
              return (
                <div
                  key={`${monthly.month}-${monthly.symbol}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatMonth(monthly.month)}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {monthly.count} {t('crypto.claims', 'claims')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatAmount(monthly.amount)} {monthly.symbol}
                    </div>
                    {usdValue && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ≈ {usdValue}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Individual Rewards List */}
      {rewards.length > 0 && (
        <div>
          <button
            onClick={() => setShowAllRewards(!showAllRewards)}
            className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 mb-3 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Receipt className="h-4 w-4" />
            {t('crypto.allRewards', 'All Rewards')} ({rewards.length})
            {showAllRewards ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAllRewards && (
            <>
              {/* Success/Error Messages */}
              {successMessage && (
                <div className="flex items-center gap-2 p-3 mb-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
                  <Check className="h-4 w-4" />
                  {successMessage}
                </div>
              )}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 mb-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
                  <X className="h-4 w-4" />
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {rewards.map((reward: PositionReward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {Number(reward.reward_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {reward.reward_token_symbol || 'tokens'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(reward.claimed_at).toLocaleDateString()} via {reward.source}
                        {reward.reward_usd && (
                          <span className="ml-2 text-green-600 dark:text-green-400">
                            ≈ ${Number(reward.reward_usd).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Create Transaction Button */}
                    {reward.reward_usd && Number(reward.reward_usd) > 0 && (
                      <div className="flex-shrink-0 ml-3">
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
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {roi && roi.rewards_count === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
          {t('crypto.noRewards', 'No rewards claimed for this position yet.')}
        </div>
      )}
    </div>
  )
}
