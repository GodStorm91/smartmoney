import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Gift, TrendingUp, Calendar, RefreshCw, Check } from 'lucide-react'
import { fetchStakingRewards, scanRewards } from '@/services/crypto-service'

interface StakingRewardsTabProps {
  source?: string
}

export function StakingRewardsTab({ source = 'symbiotic' }: StakingRewardsTabProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [scanResult, setScanResult] = useState<{ scanned: number; new: number } | null>(null)

  const { data: rewards, isLoading } = useQuery({
    queryKey: ['staking-rewards', source],
    queryFn: () => fetchStakingRewards(source),
  })

  const scanMutation = useMutation({
    mutationFn: () => scanRewards(90),
    onSuccess: (result) => {
      setScanResult({ scanned: result.scanned_claims, new: result.new_claims })
      queryClient.invalidateQueries({ queryKey: ['staking-rewards'] })
      setTimeout(() => setScanResult(null), 5000)
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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }

  const formatAmount = (amount: number) => {
    return Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }

  const sourceLabel = source === 'symbiotic' ? 'Symbiotic' : source

  // Filter out rewards under $1 from display
  const MIN_REWARD_THRESHOLD = 1

  // Filter tokens by USD value >= $1
  const filteredTokens = rewards?.rewards_by_token?.filter(
    (token) => Number(token.amount_usd) >= MIN_REWARD_THRESHOLD
  ) || []

  // Filter monthly breakdown by USD value >= $1
  const filteredMonthly = rewards?.rewards_by_month?.filter(
    (monthly) => Number(monthly.amount_usd) >= MIN_REWARD_THRESHOLD
  ) || []

  // Calculate filtered total rewards USD
  const filteredTotalRewardsUsd = filteredTokens.reduce(
    (sum, token) => sum + Number(token.amount_usd || 0),
    0
  )

  return (
    <div className="space-y-4">
      {/* Scan Button */}
      <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
        <div className="text-sm text-indigo-700 dark:text-indigo-300">
          {t('crypto.scanStakingRewardsHint', 'Scan blockchain for claimed staking rewards')}
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

      {/* Rewards Summary Card */}
      {rewards && filteredTokens.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h4 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('crypto.stakingRewardsSummary', '{{source}} Rewards Summary', { source: sourceLabel })}
          </h4>

          <div className="space-y-3">
            {/* Total Rewards */}
            <div>
              <div className="text-sm text-green-600 dark:text-green-400">
                {t('crypto.totalRewards', 'Total Rewards')}
              </div>
              {filteredTokens.length > 0 ? (
                <div className="space-y-1">
                  {filteredTokens.map((token) => {
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
                  {formatCurrency(filteredTotalRewardsUsd) || '-'}
                </div>
              )}
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {filteredMonthly.reduce((sum, m) => sum + m.count, 0)} {t('crypto.claims', 'claims')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      {rewards && filteredMonthly.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('crypto.monthlyBreakdown', 'Monthly Breakdown')}
          </h4>

          <div className="space-y-2">
            {filteredMonthly.map((monthly) => {
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

      {/* Empty State */}
      {rewards && filteredTokens.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
            {filteredTotalRewardsUsd < MIN_REWARD_THRESHOLD
              ? t('crypto.rewardsBelowThreshold', 'No rewards above ${{threshold}} to display', { threshold: MIN_REWARD_THRESHOLD })
              : t('crypto.noStakingRewards', 'No staking rewards found')}
          </p>
          <p className="text-sm">
            {t('crypto.noStakingRewardsHint', 'Click "Scan Rewards" to search for claimed rewards on the blockchain.')}
          </p>
        </div>
      )}
    </div>
  )
}
