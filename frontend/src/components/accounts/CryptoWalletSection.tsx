/**
 * CryptoWalletSection - Display crypto wallets in Accounts page
 * Simplified view focused on balances, with collapsible UI and token breakdown
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Plus, Trash2, Wallet, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import {
  fetchWallets,
  fetchWallet,
  fetchPortfolio,
  createWallet,
  deleteWallet,
  syncWallet,
} from '@/services/crypto-service'
import type { ChainId, TokenBalance } from '@/types'
import { CHAIN_INFO } from '@/types/crypto'

const SUPPORTED_CHAINS: ChainId[] = ['eth', 'bsc', 'polygon']

/** Compact token row for token list */
function TokenRow({ token, isPrivacyMode }: { token: TokenBalance; isPrivacyMode: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50">
      <div className="flex items-center gap-2 min-w-0">
        {token.logo_url ? (
          <img
            src={token.logo_url}
            alt={token.symbol}
            className="w-5 h-5 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-medium">
            {token.symbol.slice(0, 2)}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {token.symbol}
        </span>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-900 dark:text-white">
          {isPrivacyMode ? '***' : (Number(token.balance) < 0.0001 ? '<0.0001' : Number(token.balance).toFixed(4))}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isPrivacyMode ? '$***' : `$${Number(token.balance_usd).toFixed(2)}`}
        </p>
      </div>
    </div>
  )
}

export function CryptoWalletSection() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletLabel, setWalletLabel] = useState('')
  const [selectedChains, setSelectedChains] = useState<ChainId[]>(['eth', 'bsc', 'polygon'])
  const [syncingWalletId, setSyncingWalletId] = useState<number | null>(null)
  const [expandedWalletId, setExpandedWalletId] = useState<number | null>(null)

  // Queries
  const { data: wallets, isLoading } = useQuery({
    queryKey: ['crypto-wallets'],
    queryFn: fetchWallets,
  })

  // Fetch balances for each wallet
  const { data: walletsWithBalance } = useQuery({
    queryKey: ['crypto-wallets-balance', wallets?.map(w => w.id)],
    queryFn: async () => {
      if (!wallets || wallets.length === 0) return []
      return Promise.all(wallets.map(w => fetchWallet(w.id)))
    },
    enabled: !!wallets && wallets.length > 0,
  })

  // Fetch portfolio (token breakdown) for expanded wallet
  const { data: expandedPortfolio, isLoading: isLoadingPortfolio } = useQuery({
    queryKey: ['crypto-portfolio', expandedWalletId],
    queryFn: () => fetchPortfolio(expandedWalletId!),
    enabled: !!expandedWalletId,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] })
      setShowForm(false)
      setWalletAddress('')
      setWalletLabel('')
      setSelectedChains(['eth', 'bsc', 'polygon'])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] })
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets-balance'] })
    },
  })

  const syncMutation = useMutation({
    mutationFn: syncWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] })
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets-balance'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setSyncingWalletId(null)
    },
    onError: () => {
      setSyncingWalletId(null)
    },
  })

  const handleCreate = () => {
    if (!walletAddress.trim()) return
    createMutation.mutate({
      wallet_address: walletAddress.trim(),
      label: walletLabel.trim() || undefined,
      chains: selectedChains,
    })
  }

  const handleDelete = (id: number) => {
    if (confirm(t('common.confirmDelete'))) {
      deleteMutation.mutate(id)
    }
  }

  const handleSync = (id: number) => {
    setSyncingWalletId(id)
    syncMutation.mutate(id)
  }

  const toggleChain = (chain: ChainId) => {
    setSelectedChains(prev =>
      prev.includes(chain)
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    )
  }

  const toggleWalletExpand = (walletId: number) => {
    setExpandedWalletId(prev => prev === walletId ? null : walletId)
  }

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const getExplorerUrl = (address: string, chain: ChainId) => {
    const explorers: Record<ChainId, string> = {
      eth: `https://etherscan.io/address/${address}`,
      bsc: `https://bscscan.com/address/${address}`,
      polygon: `https://polygonscan.com/address/${address}`,
      arbitrum: `https://arbiscan.io/address/${address}`,
      optimism: `https://optimistic.etherscan.io/address/${address}`,
    }
    return explorers[chain] || explorers.eth
  }

  // Calculate total crypto balance
  const totalBalanceUsd = walletsWithBalance?.reduce(
    (sum, w) => sum + Number(w.total_balance_usd || 0),
    0
  ) || 0

  // Convert to display currency (USD to JPY)
  // rates.USD is JPY→USD (0.00667), so invert to get USD→JPY (~150)
  const usdToJpyRate = 1 / (rates?.USD || 0.00667)
  const totalBalanceJpy = Math.round(totalBalanceUsd * usdToJpyRate)

  if (isLoading) {
    return (
      <CollapsibleCard title={t('crypto.wallets')} badge={0}>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </CollapsibleCard>
    )
  }

  return (
    <CollapsibleCard
      title={t('crypto.wallets')}
      badge={wallets?.length || 0}
      defaultOpen={wallets && wallets.length > 0}
    >
      {/* Total Balance Header */}
      {walletsWithBalance && walletsWithBalance.length > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('crypto.totalBalance')}</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrencyPrivacy(totalBalanceJpy, currency, rates, false, isPrivacyMode)}
          </p>
        </div>
      )}

      {/* Wallet List */}
      {walletsWithBalance && walletsWithBalance.length > 0 ? (
        <div className="space-y-3 mb-4">
          {walletsWithBalance.map((wallet) => (
            <div
              key={wallet.id}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {wallet.label || shortenAddress(wallet.wallet_address)}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <code className="text-xs">{shortenAddress(wallet.wallet_address)}</code>
                      <a
                        href={getExplorerUrl(wallet.wallet_address, 'eth')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-purple-500"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {isPrivacyMode ? '$***' : `$${Number(wallet.total_balance_usd || 0).toFixed(2)}`}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {wallet.chains?.map((chain: ChainId) => (
                      <span
                        key={chain}
                        className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded"
                        title={CHAIN_INFO[chain]?.name}
                      >
                        {chain.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Token Breakdown Toggle */}
              <button
                onClick={() => toggleWalletExpand(wallet.id)}
                className="flex items-center gap-2 mt-3 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                {expandedWalletId === wallet.id ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                {t('crypto.tokens')}
              </button>

              {/* Token List */}
              {expandedWalletId === wallet.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {isLoadingPortfolio ? (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : expandedPortfolio?.chains && expandedPortfolio.chains.length > 0 ? (
                    <div className="space-y-4">
                      {expandedPortfolio.chains
                        .filter(chain => chain.tokens.length > 0 || chain.native_balance)
                        .sort((a, b) => Number(b.total_usd) - Number(a.total_usd))
                        .map(chain => (
                          <div key={chain.chain_id}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                {chain.chain_name}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {isPrivacyMode ? '$***' : `$${Number(chain.total_usd).toFixed(2)}`}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {/* Native token first */}
                              {chain.native_balance && Number(chain.native_balance.balance) > 0 && (
                                <TokenRow token={chain.native_balance} isPrivacyMode={isPrivacyMode} />
                              )}
                              {/* Other tokens sorted by value (hide < $1) */}
                              {chain.tokens
                                .filter(t => Number(t.balance_usd) >= 1)
                                .sort((a, b) => Number(b.balance_usd) - Number(a.balance_usd))
                                .map(token => (
                                  <TokenRow key={token.token_address} token={token} isPrivacyMode={isPrivacyMode} />
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                      {t('crypto.noTokens')}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {wallet.sync_statuses?.some(s => s.last_sync_at)
                    ? t('crypto.lastSync', {
                        time: new Date(
                          Math.max(...wallet.sync_statuses.filter(s => s.last_sync_at).map(s => new Date(s.last_sync_at!).getTime()))
                        ).toLocaleString()
                      })
                    : t('crypto.neverSynced')
                  }
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSync(wallet.id)}
                    disabled={syncingWalletId === wallet.id}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                    title={t('crypto.sync')}
                  >
                    {syncingWalletId === wallet.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(wallet.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="text-center py-6">
          <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">{t('crypto.noWallets')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('crypto.addWalletDescription')}</p>
        </div>
      ) : null}

      {/* Add Wallet Form */}
      {showForm ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
          <Input
            label={t('crypto.walletAddress')}
            placeholder="0x..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
          />
          <Input
            label={t('crypto.walletLabel')}
            placeholder={t('crypto.walletLabelPlaceholder')}
            value={walletLabel}
            onChange={(e) => setWalletLabel(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('crypto.selectChains')}
            </label>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_CHAINS.map((chain) => (
                <button
                  key={chain}
                  type="button"
                  onClick={() => toggleChain(chain)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedChains.includes(chain)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {CHAIN_INFO[chain]?.name || chain.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!walletAddress.trim() || selectedChains.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? t('common.saving') : t('crypto.addWallet')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('crypto.addWallet')}
        </Button>
      )}
    </CollapsibleCard>
  )
}
