/**
 * PositionDetailModal - Display detailed DeFi position analytics
 * Focused on Gain/Loss and easy to use
 */
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { X, TrendingUp, DollarSign, Percent, Clock, Gift, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  fetchPositionHistory,
  fetchPositionPerformance,
} from '@/services/crypto-service'
import type { PositionPerformance } from '@/types'
import { PositionPerformanceChart } from './PositionPerformanceChart'
import { PositionRewardsTab } from './PositionRewardsTab'
import { StakingRewardsTab } from './StakingRewardsTab'
import { ClosePositionModal } from './ClosePositionModal'
import { fetchPositionROI } from '@/services/crypto-service'
import type { GroupedPosition } from '@/components/accounts/LPPositionsSection'
import { cn } from '@/utils/cn'

type TabType = 'overview' | 'rewards'

interface PositionDetailModalProps {
  group: GroupedPosition
  onClose: () => void
}

export function PositionDetailModal({ group, onClose }: PositionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showCloseModal, setShowCloseModal] = useState(false)

  const primaryToken = group.tokens[0]

  const historyQueries = useQueries({
    queries: group.tokens.map((token) => ({
      queryKey: ['position-history', token.id],
      queryFn: () => fetchPositionHistory(token.id, 30),
      retry: false,
    })),
  })

  const isLoadingHistory = historyQueries.some((q) => q.isLoading)

  const combinedHistory = useMemo(() => {
    const allSnapshots = historyQueries
      .filter((q) => q.data?.snapshots)
      .flatMap((q) => q.data!.snapshots)

    if (allSnapshots.length === 0) return null

    const byDate = new Map<string, number>()
    for (const snap of allSnapshots) {
      const existing = byDate.get(snap.snapshot_date) || 0
      byDate.set(snap.snapshot_date, existing + Number(snap.balance_usd))
    }

    const combinedSnapshots = Array.from(byDate.entries()).map(([date, total]) => ({
      snapshot_date: date,
      balance_usd: total,
    }))

    return { snapshots: combinedSnapshots }
  }, [historyQueries])

  const performanceQueries = useQueries({
    queries: group.tokens.map((token) => ({
      queryKey: ['position-performance', token.id],
      queryFn: () => fetchPositionPerformance(token.id),
      retry: false,
    })),
  })

  const isLoadingPerformance = performanceQueries.some((q) => q.isLoading)
  const allQueriesSettled = performanceQueries.every((q) => !q.isLoading)

  const performance = useMemo((): PositionPerformance | null => {
    if (!allQueriesSettled) return null

    const successfulQueries = performanceQueries.filter((q) => q.data)
    if (successfulQueries.length === 0) return null

    const firstData = successfulQueries[0].data!
    if (successfulQueries.length === 1) return firstData

    let totalStartValue = 0
    let totalCurrentValue = 0
    let totalReturnUsd = 0
    let maxDaysHeld = 0
    let totalSnapshotCount = 0
    let hasILData = false
    let totalILUsd = 0
    let totalHodlValue = 0

    for (const q of successfulQueries) {
      const data = q.data!
      totalStartValue += Number(data.start_value_usd)
      totalCurrentValue += Number(data.current_value_usd)
      totalReturnUsd += Number(data.total_return_usd)
      maxDaysHeld = Math.max(maxDaysHeld, data.days_held)
      totalSnapshotCount += data.snapshot_count

      if (data.il_usd != null) {
        hasILData = true
        totalILUsd += Number(data.il_usd)
      }
      if (data.hodl_value_usd != null) {
        totalHodlValue += Number(data.hodl_value_usd)
      }
    }

    const totalReturnPct = totalStartValue > 0 ? (totalReturnUsd / totalStartValue) * 100 : 0

    let annualizedReturnPct: number | null = null
    if (maxDaysHeld >= 7 && totalStartValue > 0) {
      const rawAnnualized = ((totalCurrentValue / totalStartValue) ** (365 / maxDaysHeld) - 1) * 100
      if (Math.abs(rawAnnualized) <= 500) {
        annualizedReturnPct = rawAnnualized
      }
    }

    return {
      position_id: firstData.position_id,
      protocol: firstData.protocol,
      symbol: group.name,
      days_held: maxDaysHeld,
      start_value_usd: totalStartValue,
      current_value_usd: totalCurrentValue,
      total_return_usd: totalReturnUsd,
      total_return_pct: totalReturnPct,
      annualized_return_pct: annualizedReturnPct,
      current_apy: firstData.current_apy,
      snapshot_count: totalSnapshotCount,
      il_percentage: hasILData && totalStartValue > 0 ? (totalILUsd / totalStartValue) * 100 : null,
      il_usd: hasILData ? totalILUsd : null,
      hodl_value_usd: hasILData ? totalHodlValue : null,
      lp_vs_hodl_usd: hasILData ? totalCurrentValue - totalHodlValue : null,
      lp_outperformed_hodl: hasILData ? totalCurrentValue > totalHodlValue : undefined,
    } as PositionPerformance
  }, [performanceQueries, group.name, allQueriesSettled])

  const { data: roiData } = useQuery({
    queryKey: ['position-roi', primaryToken.id],
    queryFn: () => fetchPositionROI(primaryToken.id),
    retry: false,
  })

  const isLoading = isLoadingHistory || isLoadingPerformance

  const formatTokenAmount = (token: any) => {
    const amt = Number(token.balance)
    return amt < 0.0001 ? '<0.0001' : amt < 1 ? amt.toFixed(4) : amt.toFixed(2)
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100001]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[100002] flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90dvh] my-auto overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {group.tokens.slice(0, 3).map((token, i) =>
                    token.logo_url ? (
                      <img
                        key={token.id}
                        src={token.logo_url}
                        alt={token.symbol}
                        className="w-10 h-10 rounded-full border-2 border-white/20"
                        style={{ zIndex: group.tokens.length - i }}
                      />
                    ) : (
                      <div
                        key={token.id}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20"
                        style={{ zIndex: group.tokens.length - i }}
                      >
                        {token.symbol.slice(0, 2)}
                      </div>
                    )
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{group.protocol}</h2>
                  <p className="text-gray-400 text-sm">{group.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Value - Main Focus */}
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-1">Current Value</p>
              <p className="text-4xl font-bold">${group.total_usd.toFixed(2)}</p>
              <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                <span className="text-gray-400">
                  {group.tokens.map((token, i) => (
                    <span key={token.id}>
                      {i > 0 && ' + '}
                      {formatTokenAmount(token)} {token.symbol}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'overview'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Gain/Loss
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                activeTab === 'rewards'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Gift className="w-4 h-4" />
              Rewards
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <>
                    {/* Gain/Loss Summary Card */}
                    {performance && (
                      <Card className="overflow-hidden">
                        <div className={cn(
                          'p-4 text-center',
                          Number(performance.total_return_pct) >= 0
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                            : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20'
                        )}>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {Number(performance.total_return_pct) >= 0 ? (
                              <ArrowUpRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5 text-red-600" />
                            )}
                            <span className={cn(
                              'text-sm font-medium',
                              Number(performance.total_return_pct) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                            )}>
                              Total Return
                            </span>
                          </div>
                          <p className={cn(
                            'text-3xl font-bold',
                            Number(performance.total_return_pct) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          )}>
                            {Number(performance.total_return_pct) >= 0 ? '+' : ''}{performance.total_return_pct.toFixed(2)}%
                          </p>
                          <p className={cn(
                            'text-lg font-semibold mt-1',
                            Number(performance.total_return_usd) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                          )}>
                            {Number(performance.total_return_usd) >= 0 ? '+' : ''}${Math.abs(Number(performance.total_return_usd)).toFixed(2)}
                          </p>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                              <DollarSign className="w-3.5 h-3.5" />
                              Invested
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              ${Number(performance.start_value_usd).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                              <Clock className="w-3.5 h-3.5" />
                              Duration
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {performance.days_held} days
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Annualized Return */}
                    {performance && performance.annualized_return_pct !== null && (
                      <Card>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Annualized Return</span>
                          </div>
                          <span className={cn(
                            'font-bold text-lg',
                            Number(performance.annualized_return_pct) >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {Number(performance.annualized_return_pct) >= 0 ? '+' : ''}{performance.annualized_return_pct.toFixed(2)}%
                          </span>
                        </div>
                      </Card>
                    )}

                    {/* APY */}
                    {performance && performance.current_apy != null && (
                      <Card>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Current APY</span>
                          </div>
                          <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                            {Number(performance.current_apy).toFixed(2)}%
                          </span>
                        </div>
                      </Card>
                    )}

                    {/* Performance Chart */}
                    {combinedHistory && combinedHistory.snapshots.length > 0 && (
                      <Card>
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                          30-Day Performance
                        </h3>
                        <div className="h-40">
                          <PositionPerformanceChart snapshots={combinedHistory.snapshots as any} />
                        </div>
                      </Card>
                    )}

                    {/* Close Position Button */}
                    <button
                      onClick={() => setShowCloseModal(true)}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Close Position
                    </button>
                  </>
                )}

                {activeTab === 'rewards' && (
                  <>
                    {group.protocol_module === 'staked' ? (
                      <StakingRewardsTab source="symbiotic" />
                    ) : (
                      <PositionRewardsTab positionId={primaryToken.id} />
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Close Position Modal */}
          {showCloseModal && (
            <ClosePositionModal
              group={group}
              lastSnapshotValueUsd={group.total_usd}
              costBasisUsd={roiData?.cost_basis_usd ?? null}
              totalRewardsUsd={roiData?.total_rewards_usd ?? null}
              onClose={() => setShowCloseModal(false)}
              onSuccess={() => {
                setShowCloseModal(false)
                onClose()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
