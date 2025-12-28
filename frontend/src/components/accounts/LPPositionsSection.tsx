/**
 * LPPositionsSection - Display DeFi/LP positions in Accounts page
 * Separate section showing staking, LP, and lending positions
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Layers, RefreshCw, ChevronRight } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSettings } from '@/contexts/SettingsContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { formatCurrency } from '@/utils/formatCurrency'
import { fetchWallets, fetchDefiPositions } from '@/services/crypto-service'
import { PositionDetailModal } from '@/components/crypto/PositionDetailModal'
import type { DefiPosition, ChainId } from '@/types'
import { CHAIN_INFO } from '@/types/crypto'

/** Position type icons */
const POSITION_ICONS: Record<string, string> = {
  deposit: '💰',
  stake: '🔒',
  borrow: '💸',
  reward: '🎁',
  liquidity: '💧',
}

/** Protocol module labels */
const MODULE_LABELS: Record<string, string> = {
  liquidity_pool: 'LP',
  staking: 'Staking',
  lending: 'Lending',
  farming: 'Farming',
  vault: 'Vault',
}

/** Grouped position containing multiple tokens from same LP */
interface GroupedPosition {
  key: string // unique key for grouping
  name: string // LP pool name
  protocol: string
  protocol_module: string
  position_type: string
  chain_id: string
  tokens: DefiPosition[] // all tokens in this position
  total_usd: number
}

/** Group positions by LP pool (same name + protocol + chain) */
function groupPositionsByPool(positions: DefiPosition[]): GroupedPosition[] {
  const groups: Record<string, GroupedPosition> = {}

  for (const pos of positions) {
    // Create unique key for grouping: protocol + chain + name + type
    const key = `${pos.protocol}-${pos.chain_id}-${pos.name || pos.token_name}-${pos.position_type}`

    if (!groups[key]) {
      groups[key] = {
        key,
        name: pos.name || pos.token_name,
        protocol: pos.protocol,
        protocol_module: pos.protocol_module,
        position_type: pos.position_type,
        chain_id: pos.chain_id,
        tokens: [],
        total_usd: 0,
      }
    }

    groups[key].tokens.push(pos)
    groups[key].total_usd += Number(pos.balance_usd)
  }

  return Object.values(groups)
}

/** Single grouped position row - shows all tokens together */
function PositionRow({
  group,
  onClick,
}: {
  group: GroupedPosition
  onClick: (position: DefiPosition) => void
}) {
  const chainId = group.chain_id as ChainId
  const chainInfo = CHAIN_INFO[chainId]
  const primaryToken = group.tokens[0]

  // Format tokens display - e.g., "WETH + USDC" or "0.0012 WETH + 1.5 USDC"
  const tokensDisplay = group.tokens
    .map((t) => {
      const amt = Number(t.balance)
      const formatted = amt < 0.0001 ? '<0.0001' : amt < 1 ? amt.toFixed(4) : amt.toFixed(2)
      return `${formatted} ${t.symbol}`
    })
    .join(' + ')

  return (
    <button
      onClick={() => onClick(primaryToken)}
      className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Token logos stacked */}
        <div className="relative flex-shrink-0">
          {group.tokens.length > 1 ? (
            <div className="flex -space-x-2">
              {group.tokens.slice(0, 3).map((t, i) =>
                t.logo_url ? (
                  <img
                    key={t.id}
                    src={t.logo_url}
                    alt={t.symbol}
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800"
                    style={{ zIndex: group.tokens.length - i }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div
                    key={t.id}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800"
                    style={{ zIndex: group.tokens.length - i }}
                  >
                    {t.symbol.slice(0, 2)}
                  </div>
                )
              )}
              {group.tokens.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800">
                  +{group.tokens.length - 3}
                </div>
              )}
            </div>
          ) : primaryToken.logo_url ? (
            <img
              src={primaryToken.logo_url}
              alt={primaryToken.symbol}
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              {POSITION_ICONS[group.position_type] || '📈'}
            </div>
          )}
        </div>

        <div className="min-w-0">
          {/* Protocol & Module */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {group.protocol}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
              {MODULE_LABELS[group.protocol_module] || group.protocol_module}
            </span>
          </div>

          {/* Position name & chain */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="truncate">{group.name}</span>
            {chainInfo && (
              <span className="text-xs px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                {chainInfo.icon} {chainId.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Value + Tokens + Arrow */}
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            ${group.total_usd.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate">
            {tokensDisplay}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
      </div>
    </button>
  )
}

export function LPPositionsSection() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const [selectedPosition, setSelectedPosition] = useState<DefiPosition | null>(null)
  const rates = useRatesMap()

  // Get all wallets first
  const { data: wallets, isLoading: isLoadingWallets } = useQuery({
    queryKey: ['crypto-wallets'],
    queryFn: fetchWallets,
  })

  // Fetch DeFi positions for all wallets
  const { data: allPositions, isLoading: isLoadingPositions, refetch } = useQuery({
    queryKey: ['crypto-defi-positions', wallets?.map(w => w.id)],
    queryFn: async () => {
      if (!wallets || wallets.length === 0) return []
      const results = await Promise.all(
        wallets.map(w =>
          fetchDefiPositions(w.id).catch(() => ({
            wallet_address: w.wallet_address,
            total_value_usd: 0,
            positions: [],
            last_sync_at: null,
          }))
        )
      )
      return results
    },
    enabled: !!wallets && wallets.length > 0,
  })

  // Flatten all positions and group by LP pool
  const positions = allPositions?.flatMap(r => r.positions) || []
  const groupedPositions = groupPositionsByPool(positions)
  const totalValueUsd = allPositions?.reduce((sum, r) => sum + Number(r.total_value_usd || 0), 0) || 0

  // Convert to display currency (USD to JPY)
  const usdToJpyRate = 1 / (rates?.USD || 0.00667)
  const totalValueJpy = Math.round(totalValueUsd * usdToJpyRate)

  // Group by protocol for display
  const groupsByProtocol = groupedPositions.reduce((acc, group) => {
    const key = group.protocol
    if (!acc[key]) acc[key] = []
    acc[key].push(group)
    return acc
  }, {} as Record<string, GroupedPosition[]>)

  const isLoading = isLoadingWallets || isLoadingPositions

  if (isLoading) {
    return (
      <CollapsibleCard title={t('crypto.defiPositions')} badge={0}>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </CollapsibleCard>
    )
  }

  // Don't show section if no wallets
  if (!wallets || wallets.length === 0) {
    return null
  }

  return (
    <CollapsibleCard
      title={t('crypto.defiPositions')}
      badge={groupedPositions.length}
      defaultOpen={groupedPositions.length > 0}
    >
      {/* Total Value Header */}
      {positions.length > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('crypto.totalDefiValue')}</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(totalValueJpy, currency, rates)}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              title={t('crypto.refresh')}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Positions List */}
      {groupedPositions.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupsByProtocol)
            .sort(([, a], [, b]) => {
              const totalA = a.reduce((sum, g) => sum + g.total_usd, 0)
              const totalB = b.reduce((sum, g) => sum + g.total_usd, 0)
              return totalB - totalA
            })
            .map(([protocol, groups]) => (
              <div
                key={protocol}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Protocol header */}
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {protocol}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ${groups.reduce((sum, g) => sum + g.total_usd, 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Grouped Positions */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {groups
                    .sort((a, b) => b.total_usd - a.total_usd)
                    .map(group => (
                      <PositionRow
                        key={group.key}
                        group={group}
                        onClick={setSelectedPosition}
                      />
                    ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('crypto.noDefiPositions')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {t('crypto.noDefiPositionsDescription')}
          </p>
        </div>
      )}

      {/* Position Detail Modal */}
      {selectedPosition && (
        <PositionDetailModal
          position={selectedPosition}
          onClose={() => setSelectedPosition(null)}
        />
      )}
    </CollapsibleCard>
  )
}
