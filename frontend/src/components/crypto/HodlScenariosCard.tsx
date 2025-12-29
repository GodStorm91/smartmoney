/**
 * HodlScenariosCard - Compare LP vs HODL strategies
 * Shows what-if scenarios for different holding strategies
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchHodlScenarios } from '@/services/crypto-service'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { HodlScenarioItem } from '@/types'

interface HodlScenariosCardProps {
  positionIds: string[]
}

/** Color coding for returns */
function getReturnColor(returnPct: number): string {
  if (returnPct > 0) return 'text-green-600 dark:text-green-400'
  if (returnPct < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-600 dark:text-gray-400'
}

/** Get bar width percentage (relative to max value) */
function getBarWidth(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0
  return Math.min(100, (value / maxValue) * 100)
}

/** Format return with sign */
function formatReturn(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function HodlScenariosCard({ positionIds }: HodlScenariosCardProps) {
  const { t } = useTranslation('common')
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: scenarios, isLoading, error } = useQuery({
    queryKey: ['hodl-scenarios', positionIds],
    queryFn: () => fetchHodlScenarios(positionIds),
    enabled: positionIds.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Don't render if less than 2 tokens (single token positions)
  if (positionIds.length < 2) {
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }

  if (error || !scenarios) {
    return null // Silently fail - scenarios are optional
  }

  // Find winner and LP for comparison
  const lpScenario = scenarios.scenarios.find(s => s.type === 'lp')
  const winner = scenarios.scenarios[0] // Already sorted by value desc
  const maxValue = winner?.value_usd || 0

  // Summary text for collapsed view
  const getSummaryText = () => {
    if (!winner || !lpScenario) return ''

    if (winner.type === 'lp') {
      return t('crypto.hodlScenarios.lpWinning', { pct: formatReturn(winner.return_pct) })
    }

    const diff = winner.value_usd - lpScenario.value_usd
    return t('crypto.hodlScenarios.alternativeBetter', {
      name: winner.name,
      diff: diff.toFixed(2),
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span className="font-medium text-gray-900 dark:text-white">
            {t('crypto.hodlScenarios.title')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {getSummaryText()}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Scenarios Bar Chart */}
          <div className="space-y-3">
            {scenarios.scenarios.map((scenario, idx) => (
              <ScenarioBar
                key={scenario.name}
                scenario={scenario}
                maxValue={maxValue}
                isWinner={idx === 0}
                isLp={scenario.type === 'lp'}
              />
            ))}
          </div>

          {/* Info Footer */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {t('crypto.hodlScenarios.initialValue')}: ${scenarios.initial_value_usd.toFixed(2)}
              </span>
              <span>
                {t('crypto.hodlScenarios.period')}: {scenarios.days_held} {t('crypto.days')}
              </span>
            </div>

            {/* Insight text */}
            {winner && winner.type !== 'lp' && lpScenario && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                💡 {t('crypto.hodlScenarios.insight', {
                  name: winner.name,
                  diff: Math.abs(scenarios.winner_vs_lp_usd).toFixed(2),
                })}
              </p>
            )}

            {winner && winner.type === 'lp' && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                ✓ {t('crypto.hodlScenarios.lpOptimal')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Individual scenario bar */
function ScenarioBar({
  scenario,
  maxValue,
  isWinner,
  isLp,
}: {
  scenario: HodlScenarioItem
  maxValue: number
  isWinner: boolean
  isLp: boolean
}) {
  const barWidth = getBarWidth(scenario.value_usd, maxValue)
  const returnColor = getReturnColor(scenario.return_pct)

  // Bar color based on type
  const getBarColor = () => {
    if (isLp) return 'bg-indigo-500'
    if (scenario.type === 'hodl_balanced') return 'bg-purple-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {scenario.name}
          </span>
          {isWinner && (
            <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
              Best
            </span>
          )}
          {isLp && !isWinner && (
            <span className="px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
              LP
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            ${scenario.value_usd.toFixed(2)}
          </span>
          <span className={`flex items-center gap-0.5 text-sm ${returnColor}`}>
            {scenario.return_pct >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {formatReturn(scenario.return_pct)}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}
