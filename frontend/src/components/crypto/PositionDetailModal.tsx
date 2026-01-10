/**
 * PositionDetailModal - Display detailed DeFi position analytics
 * Shows performance metrics, IL analysis, charts, and AI insights
 */
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X, TrendingUp, TrendingDown, AlertTriangle, Sparkles, ChevronDown, ChevronUp, Gift } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  fetchPositionHistory,
  fetchPositionPerformance,
  fetchPositionInsights,
} from '@/services/crypto-service'
import type { DefiPosition, PositionPerformance, PositionInsights } from '@/types'
import { CHAIN_INFO, ChainId } from '@/types/crypto'
import { PositionPerformanceChart } from './PositionPerformanceChart'
import { HodlScenariosCard } from './HodlScenariosCard'
import { PositionRewardsTab } from './PositionRewardsTab'
import { StakingRewardsTab } from './StakingRewardsTab'
import { ClosePositionModal } from './ClosePositionModal'
import { fetchPositionROI } from '@/services/crypto-service'
import type { GroupedPosition } from '@/components/accounts/LPPositionsSection'

type TabType = 'overview' | 'rewards'

interface PositionDetailModalProps {
  group: GroupedPosition
  onClose: () => void
}

/** Format number with sign - handles string values from API */
function formatWithSign(value: number | string, decimals: number = 2): string {
  const num = Number(value)
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(decimals)}`
}

/** Risk level badge component */
function RiskBadge({ level }: { level: string }) {
  const colors = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level as keyof typeof colors] || colors.medium}`}>
      {level.toUpperCase()}
    </span>
  )
}

/** Performance metrics card */
function PerformanceCard({ performance }: { performance: PositionPerformance }) {
  const { t } = useTranslation('common')
  const isPositive = Number(performance.total_return_pct) >= 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        {t('crypto.performance')}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Return */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('crypto.totalReturn')}</p>
          <p className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatWithSign(performance.total_return_pct)}%
          </p>
          <p className="text-xs text-gray-500">
            ${formatWithSign(performance.total_return_usd)}
          </p>
        </div>

        {/* Annualized */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('crypto.annualized')}</p>
          {performance.annualized_return_pct !== null ? (
            <p className={`text-lg font-bold ${Number(performance.annualized_return_pct) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatWithSign(performance.annualized_return_pct)}%
            </p>
          ) : (
            <p className="text-lg font-bold text-gray-400">N/A</p>
          )}
          <p className="text-xs text-gray-500">{performance.days_held} {t('crypto.days')}</p>
        </div>

        {/* Current Value */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('crypto.currentValue')}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${Number(performance.current_value_usd).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            {t('crypto.from')} ${Number(performance.start_value_usd).toFixed(2)}
          </p>
        </div>

        {/* APY */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('crypto.currentApy')}</p>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {performance.current_apy != null ? `${Number(performance.current_apy).toFixed(2)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">{performance.snapshot_count} {t('crypto.snapshots')}</p>
        </div>
      </div>
    </div>
  )
}

/** Impermanent Loss card */
function ILCard({ performance }: { performance: PositionPerformance }) {
  const { t } = useTranslation('common')

  if (performance.il_percentage == null) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          {t('crypto.impermanentLoss')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {t('crypto.ilNotAvailable')}
        </p>
      </div>
    )
  }

  const ilIsNegative = Number(performance.il_percentage) < 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        {t('crypto.impermanentLoss')}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* IL Percentage */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('crypto.ilPercentage')}</p>
          <p className={`text-lg font-bold ${ilIsNegative ? 'text-red-600' : 'text-green-600'}`}>
            {Number(performance.il_percentage).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500">
            ${performance.il_usd != null ? Number(performance.il_usd).toFixed(2) : '0.00'}
          </p>
        </div>

        {/* HODL Value */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('crypto.hodlValue')}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${performance.hodl_value_usd != null ? Number(performance.hodl_value_usd).toFixed(2) : 'N/A'}
          </p>
        </div>

        {/* LP vs HODL */}
        <div className="col-span-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('crypto.lpVsHodl')}</p>
          <div className="flex items-center gap-2 mt-1">
            {performance.lp_outperformed_hodl ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">{t('crypto.lpOutperformed')}</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-red-600 font-medium">{t('crypto.hodlOutperformed')}</span>
              </>
            )}
            <span className="text-gray-500 text-sm">
              (${Math.abs(Number(performance.lp_vs_hodl_usd) || 0).toFixed(2)})
            </span>
          </div>
        </div>

        {/* Estimated Yield */}
        {performance.estimated_yield_pct != null && (
          <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('crypto.estimatedYield')}</p>
            <p className="text-green-600 font-bold">
              {formatWithSign(performance.estimated_yield_pct)}%
              <span className="text-gray-500 text-sm ml-2">
                (${performance.estimated_yield_usd != null ? Number(performance.estimated_yield_usd).toFixed(2) : '0.00'})
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/** AI Insights card */
function InsightsCard({ insights, isLoading }: { insights?: PositionInsights; isLoading: boolean }) {
  const { t } = useTranslation('common')
  const [showScenarios, setShowScenarios] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {t('crypto.aiInsights')}
          </h3>
        </div>
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }

  if (!insights) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {t('crypto.aiInsights')}
          </h3>
        </div>
        <RiskBadge level={insights.risk_level} />
      </div>

      {/* Summary */}
      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
        {insights.summary}
      </p>

      {/* IL Analysis */}
      {insights.il_analysis && (
        <div className="bg-white/50 dark:bg-gray-800/50 rounded p-2 mb-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('crypto.ilAnalysis')}
          </p>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            {insights.il_analysis}
          </p>
        </div>
      )}

      {/* Observation */}
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-gray-700 dark:text-gray-300 text-sm">
          {insights.observation}
        </p>
      </div>

      {/* Scenarios toggle */}
      {(insights.scenario_up || insights.scenario_down) && (
        <button
          onClick={() => setShowScenarios(!showScenarios)}
          className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
        >
          {showScenarios ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {t('crypto.viewScenarios')}
        </button>
      )}

      {showScenarios && (
        <div className="mt-3 space-y-2">
          {insights.scenario_up && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
              <p className="text-xs font-medium text-green-700 dark:text-green-400">
                {t('crypto.priceUp20')}
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                {insights.scenario_up}
              </p>
            </div>
          )}
          {insights.scenario_down && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">
                {t('crypto.priceDown20')}
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                {insights.scenario_down}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      {insights.recommendation && (
        <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
          <p className="text-gray-600 dark:text-gray-400 text-xs italic">
            {insights.recommendation}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
        {t('crypto.insightsDisclaimer')}
      </p>
    </div>
  )
}

export function PositionDetailModal({ group, onClose }: PositionDetailModalProps) {
  const { t, i18n } = useTranslation('common')
  useSettings() // For potential future currency formatting
  const chainInfo = CHAIN_INFO[group.chain_id as ChainId]
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [showCloseModal, setShowCloseModal] = useState(false)

  // Primary token for API calls (use first token's ID for performance/insights)
  const primaryToken = group.tokens[0]

  // Fetch position history for ALL tokens in the group (parallel queries)
  const historyQueries = useQueries({
    queries: group.tokens.map((token) => ({
      queryKey: ['position-history', token.id],
      queryFn: () => fetchPositionHistory(token.id, 30),
      retry: false,
    })),
  })

  const isLoadingHistory = historyQueries.some((q) => q.isLoading)
  const isHistoryError = historyQueries.every((q) => q.isError)

  // Combine snapshots from all tokens by date, summing USD values
  const combinedHistory = useMemo(() => {
    const allSnapshots = historyQueries
      .filter((q) => q.data?.snapshots)
      .flatMap((q) => q.data!.snapshots)

    if (allSnapshots.length === 0) return null

    // Group snapshots by date and sum values
    const byDate = new Map<string, number>()
    for (const snap of allSnapshots) {
      const existing = byDate.get(snap.snapshot_date) || 0
      byDate.set(snap.snapshot_date, existing + Number(snap.balance_usd))
    }

    // Convert to snapshot-like objects for the chart
    const combinedSnapshots = Array.from(byDate.entries()).map(([date, total]) => ({
      snapshot_date: date,
      balance_usd: total,
    }))

    return {
      snapshots: combinedSnapshots,
    }
  }, [historyQueries])

  // Fetch performance metrics for ALL tokens in the group (parallel queries)
  const performanceQueries = useQueries({
    queries: group.tokens.map((token) => ({
      queryKey: ['position-performance', token.id],
      queryFn: () => fetchPositionPerformance(token.id),
      retry: false,
    })),
  })

  const isLoadingPerformance = performanceQueries.some((q) => q.isLoading)
  const isPerformanceError = performanceQueries.every((q) => q.isError)

  // Wait for all queries to finish loading
  const allQueriesSettled = performanceQueries.every((q) => !q.isLoading)

  // Aggregate performance from all tokens
  const performance = useMemo((): PositionPerformance | null => {
    // Debug: log ALL query states FIRST
    console.log('=== LP Performance Debug ===')
    console.log('Total tokens in group:', group.tokens.length)
    console.log('Token IDs:', group.tokens.map(t => ({ symbol: t.symbol, id: t.id.substring(0, 50) })))
    console.log('All queries settled:', allQueriesSettled)
    console.log('Query states:', performanceQueries.map((q, i) => ({
      index: i,
      symbol: group.tokens[i]?.symbol,
      isLoading: q.isLoading,
      isError: q.isError,
      hasData: !!q.data,
      dataValue: q.data?.current_value_usd,
      error: q.error?.message
    })))

    // Don't aggregate until all queries have settled
    if (!allQueriesSettled) {
      console.log('Still loading, returning null')
      return null
    }

    const successfulQueries = performanceQueries.filter((q) => q.data)
    console.log('Successful queries count:', successfulQueries.length)

    if (successfulQueries.length === 0) {
      console.log('No successful queries, returning null')
      return null
    }

    // Use first query's data as base
    const firstData = successfulQueries[0].data!
    if (successfulQueries.length === 1) {
      console.log('Only 1 query succeeded, returning:', firstData.current_value_usd)
      return firstData
    }

    console.log('Aggregating', successfulQueries.length, 'queries')
    console.log('Values to aggregate:', successfulQueries.map(q => q.data?.current_value_usd))

    // Aggregate values from all tokens
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

    // Recalculate percentages based on totals
    const totalReturnPct = totalStartValue > 0
      ? (totalReturnUsd / totalStartValue) * 100
      : 0

    // Calculate annualized return - cap unrealistic values
    let annualizedReturnPct: number | null = null
    if (maxDaysHeld >= 7 && totalStartValue > 0) {
      const rawAnnualized = ((totalCurrentValue / totalStartValue) ** (365 / maxDaysHeld) - 1) * 100
      // Cap at ±500% - anything above is unrealistic for display
      if (Math.abs(rawAnnualized) <= 500) {
        annualizedReturnPct = rawAnnualized
      }
      // If > 500%, leave as null (shows N/A)
    }

    return {
      position_id: firstData.position_id,
      protocol: firstData.protocol,
      symbol: group.name, // Use group name for multi-token
      days_held: maxDaysHeld,
      start_value_usd: totalStartValue,
      current_value_usd: totalCurrentValue,
      total_return_usd: totalReturnUsd,
      total_return_pct: totalReturnPct,
      annualized_return_pct: annualizedReturnPct,
      current_apy: firstData.current_apy,
      snapshot_count: totalSnapshotCount,
      // IL metrics (aggregated if available)
      il_percentage: hasILData && totalStartValue > 0
        ? (totalILUsd / totalStartValue) * 100
        : null,
      il_usd: hasILData ? totalILUsd : null,
      hodl_value_usd: hasILData ? totalHodlValue : null,
      lp_vs_hodl_usd: hasILData ? totalCurrentValue - totalHodlValue : null,
      lp_outperformed_hodl: hasILData ? totalCurrentValue > totalHodlValue : undefined,
    } as PositionPerformance
  }, [performanceQueries, group.name, allQueriesSettled])

  // Fetch AI insights - only if performance data exists
  const { data: insights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ['position-insights', primaryToken.id, i18n.language],
    queryFn: () => fetchPositionInsights(primaryToken.id, i18n.language),
    enabled: !!performance && !isPerformanceError,
    retry: false,
  })

  // Fetch ROI data for close position modal (includes total_rewards_usd)
  const { data: roiData } = useQuery({
    queryKey: ['position-roi', primaryToken.id],
    queryFn: () => fetchPositionROI(primaryToken.id),
    retry: false,
  })

  const isLoading = isLoadingHistory || isLoadingPerformance
  const noDataYet = isHistoryError || isPerformanceError

  // Format token amounts for display
  const formatTokenAmount = (token: DefiPosition) => {
    const amt = Number(token.balance)
    return amt < 0.0001 ? '<0.0001' : amt < 1 ? amt.toFixed(4) : amt.toFixed(2)
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Stacked token logos */}
            <div className="relative flex -space-x-2">
              {group.tokens.slice(0, 3).map((token, i) =>
                token.logo_url ? (
                  <img
                    key={token.id}
                    src={token.logo_url}
                    alt={token.symbol}
                    className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900"
                    style={{ zIndex: group.tokens.length - i }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div
                    key={token.id}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs border-2 border-white dark:border-gray-900"
                    style={{ zIndex: group.tokens.length - i }}
                  >
                    {token.symbol.slice(0, 2)}
                  </div>
                )
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {group.protocol} - {group.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {chainInfo && (
                  <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                    {chainInfo.icon} {group.chain_id.toUpperCase()}
                  </span>
                )}
                <span>{group.position_type}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              {t('crypto.closePosition', 'Close Position')}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {t('crypto.overview', 'Overview')}
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'rewards'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Gift className="w-4 h-4" />
            {t('crypto.rewards', 'Rewards')}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <>
                  {/* Current Value */}
                  <div className="text-center py-4">
                <p className="text-sm text-gray-500">{t('crypto.currentValue')}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${group.total_usd.toFixed(2)}
                </p>
                <div className="text-sm text-gray-500 mt-1">
                  {group.tokens.map((token, i) => (
                    <span key={token.id}>
                      {i > 0 && ' + '}
                      {formatTokenAmount(token)} {token.symbol}
                    </span>
                  ))}
                </div>
              </div>

              {/* Token Breakdown Card */}
              {group.tokens.length > 1 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    {t('crypto.tokenBreakdown', 'Token Breakdown')}
                  </h3>
                  <div className="space-y-2">
                    {group.tokens.map((token) => (
                      <div key={token.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {token.logo_url ? (
                            <img src={token.logo_url} alt={token.symbol} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                              {token.symbol.slice(0, 2)}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">{token.symbol}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatTokenAmount(token)}
                          </p>
                          <p className="text-xs text-gray-500">
                            ${Number(token.balance_usd).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                  {/* No Historical Data Yet Message */}
                  {noDataYet && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-300">
                            {t('crypto.noHistoricalDataTitle')}
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            {t('crypto.noHistoricalDataMessage')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance Chart - Combined value of all tokens */}
                  {combinedHistory && combinedHistory.snapshots.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                        {t('crypto.valueHistory')} ({t('crypto.combinedValue', 'Combined Value')})
                      </h3>
                      <div className="h-48">
                        <PositionPerformanceChart snapshots={combinedHistory.snapshots as any} />
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics - override current_value with group.total_usd which is always correct */}
                  {performance && (() => {
                    const currentValue = group.total_usd
                    const startValue = Number(performance.start_value_usd)
                    const totalReturnUsd = currentValue - startValue
                    const totalReturnPct = startValue > 0 ? (totalReturnUsd / startValue) * 100 : 0
                    // Calculate annualized, cap at ±500% to avoid unrealistic values
                    const daysHeld = performance.days_held || 1
                    let annualizedPct: number | null = null
                    if (daysHeld >= 7 && startValue > 0) {
                      const raw = ((currentValue / startValue) ** (365 / daysHeld) - 1) * 100
                      annualizedPct = Math.abs(raw) <= 500 ? raw : null
                    }
                    return <PerformanceCard performance={{
                      ...performance,
                      current_value_usd: currentValue,
                      total_return_usd: totalReturnUsd,
                      total_return_pct: totalReturnPct,
                      annualized_return_pct: annualizedPct,
                    }} />
                  })()}

                  {/* Impermanent Loss */}
                  {performance && <ILCard performance={performance} />}

                  {/* HODL Scenarios - only for multi-token positions */}
                  {group.tokens.length >= 2 && (
                    <HodlScenariosCard positionIds={group.tokens.map((t) => t.id)} />
                  )}

                  {/* AI Insights - only show if we have performance data */}
                  {!noDataYet && <InsightsCard insights={insights} isLoading={isLoadingInsights} />}
                </>
              )}

              {/* Rewards Tab */}
              {activeTab === 'rewards' && (
                group.protocol_module === 'staked' ? (
                  <StakingRewardsTab source="symbiotic" />
                ) : (
                  <PositionRewardsTab positionId={primaryToken.id} />
                )
              )}
            </>
          )}
        </div>
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
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}
