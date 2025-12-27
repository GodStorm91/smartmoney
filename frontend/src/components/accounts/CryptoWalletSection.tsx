/**
 * CryptoWalletSection - Display crypto wallets in Accounts page
 * Simplified view focused on balances, with collapsible UI
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Plus, Trash2, Wallet, ExternalLink } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/CollapsibleCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSettings } from '@/contexts/SettingsContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { formatCurrency } from '@/utils/formatCurrency'
import {
  fetchWallets,
  fetchWallet,
  createWallet,
  deleteWallet,
  syncWallet,
} from '@/services/crypto-service'
import type { ChainId } from '@/types'
import { CHAIN_INFO } from '@/types/crypto'

const SUPPORTED_CHAINS: ChainId[] = ['eth', 'bsc', 'polygon']

export function CryptoWalletSection() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { currency } = useSettings()
  const rates = useRatesMap()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletLabel, setWalletLabel] = useState('')
  const [selectedChains, setSelectedChains] = useState<ChainId[]>(['eth', 'bsc', 'polygon'])
  const [syncingWalletId, setSyncingWalletId] = useState<number | null>(null)

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
    (sum, w) => sum + (w.total_balance_usd || 0),
    0
  ) || 0

  // Convert to display currency (USD to JPY cents for consistency)
  const usdToJpyRate = rates?.USD || 150
  const totalBalanceJpy = Math.round(totalBalanceUsd * usdToJpyRate * 100)

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
            {formatCurrency(totalBalanceJpy, currency, rates)}
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
                    ${wallet.total_balance_usd?.toFixed(2) || '0.00'}
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
