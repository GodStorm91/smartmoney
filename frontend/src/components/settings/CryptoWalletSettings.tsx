import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  fetchWallets,
  createWallet,
  deleteWallet,
  syncWallet,
  fetchRewardContracts,
  createRewardContract,
  deleteRewardContract,
} from '@/services/crypto-service'
import type { ChainId, CryptoWallet, RewardContract } from '@/types'
import { CHAIN_INFO } from '@/types/crypto'

const SUPPORTED_CHAINS: ChainId[] = ['eth', 'bsc', 'polygon']

export function CryptoWalletSettings() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  // Wallet form state
  const [showWalletForm, setShowWalletForm] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletLabel, setWalletLabel] = useState('')
  const [selectedChains, setSelectedChains] = useState<ChainId[]>(['eth', 'bsc', 'polygon'])

  // Contract form state
  const [showContractForm, setShowContractForm] = useState(false)
  const [contractChain, setContractChain] = useState<ChainId>('polygon')
  const [contractAddress, setContractAddress] = useState('')
  const [contractLabel, setContractLabel] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')

  // Syncing state
  const [syncingWalletId, setSyncingWalletId] = useState<number | null>(null)

  // Queries
  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ['crypto-wallets'],
    queryFn: fetchWallets,
  })

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['reward-contracts'],
    queryFn: fetchRewardContracts,
  })

  // Mutations
  const createWalletMutation = useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] })
      setShowWalletForm(false)
      resetWalletForm()
    },
  })

  const deleteWalletMutation = useMutation({
    mutationFn: deleteWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] })
    },
  })

  const syncWalletMutation = useMutation({
    mutationFn: syncWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setSyncingWalletId(null)
    },
    onError: () => {
      setSyncingWalletId(null)
    },
  })

  const createContractMutation = useMutation({
    mutationFn: createRewardContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-contracts'] })
      setShowContractForm(false)
      resetContractForm()
    },
  })

  const deleteContractMutation = useMutation({
    mutationFn: deleteRewardContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-contracts'] })
    },
  })

  const resetWalletForm = () => {
    setWalletAddress('')
    setWalletLabel('')
    setSelectedChains(['eth', 'bsc', 'polygon'])
  }

  const resetContractForm = () => {
    setContractChain('polygon')
    setContractAddress('')
    setContractLabel('')
    setTokenSymbol('')
  }

  const handleCreateWallet = () => {
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert(t('crypto.invalidAddress'))
      return
    }
    createWalletMutation.mutate({
      wallet_address: walletAddress,
      label: walletLabel || undefined,
      chains: selectedChains,
    })
  }

  const handleSyncWallet = (walletId: number) => {
    setSyncingWalletId(walletId)
    syncWalletMutation.mutate(walletId)
  }

  const handleCreateContract = () => {
    if (!contractAddress || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert(t('crypto.invalidAddress'))
      return
    }
    createContractMutation.mutate({
      chain_id: contractChain,
      contract_address: contractAddress,
      label: contractLabel || undefined,
      token_symbol: tokenSymbol || undefined,
    })
  }

  const toggleChain = (chain: ChainId) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    )
  }

  if (walletsLoading || contractsLoading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Crypto Wallets */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('crypto.wallets')}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setShowWalletForm(!showWalletForm)}>
            {showWalletForm ? t('common.cancel') : t('crypto.addWallet')}
          </Button>
        </div>

        {/* Add wallet form */}
        {showWalletForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <Input
              label={t('crypto.walletAddress')}
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
            <Input
              label={t('crypto.walletLabel')}
              placeholder={t('crypto.labelPlaceholder')}
              value={walletLabel}
              onChange={(e) => setWalletLabel(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('crypto.chains')}
              </label>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_CHAINS.map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    onClick={() => toggleChain(chain)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedChains.includes(chain)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {CHAIN_INFO[chain].icon} {CHAIN_INFO[chain].name}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleCreateWallet}
              disabled={createWalletMutation.isPending}
              className="w-full"
            >
              {createWalletMutation.isPending ? t('common.loading') : t('crypto.addWallet')}
            </Button>
          </div>
        )}

        {/* Wallet list */}
        <div className="space-y-3">
          {wallets && wallets.length > 0 ? (
            wallets.map((wallet: CryptoWallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {wallet.label || t('crypto.unnamedWallet')}
                    </span>
                    <div className="flex gap-1">
                      {wallet.chains.map((chain) => (
                        <span key={chain} title={CHAIN_INFO[chain].name}>
                          {CHAIN_INFO[chain].icon}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                    {wallet.wallet_address}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncWallet(wallet.id)}
                    disabled={syncingWalletId === wallet.id}
                  >
                    {syncingWalletId === wallet.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      t('crypto.sync')
                    )}
                  </Button>
                  <button
                    onClick={() => {
                      if (confirm(t('crypto.confirmDeleteWallet'))) {
                        deleteWalletMutation.mutate(wallet.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-center py-4">
              {t('crypto.noWallets')}
            </p>
          )}
        </div>
      </Card>

      {/* Reward Contracts */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('crypto.rewardContracts')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('crypto.rewardContractsDescription')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowContractForm(!showContractForm)}
          >
            {showContractForm ? t('common.cancel') : t('crypto.addContract')}
          </Button>
        </div>

        {/* Add contract form */}
        {showContractForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('crypto.chain')}
              </label>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_CHAINS.map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    onClick={() => setContractChain(chain)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      contractChain === chain
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {CHAIN_INFO[chain].icon} {CHAIN_INFO[chain].name}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label={t('crypto.contractAddress')}
              placeholder="0x..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
            />
            <Input
              label={t('crypto.contractLabel')}
              placeholder={t('crypto.contractLabelPlaceholder')}
              value={contractLabel}
              onChange={(e) => setContractLabel(e.target.value)}
            />
            <Input
              label={t('crypto.tokenSymbol')}
              placeholder="STEER"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
            />
            <Button
              onClick={handleCreateContract}
              disabled={createContractMutation.isPending}
              className="w-full"
            >
              {createContractMutation.isPending ? t('common.loading') : t('crypto.addContract')}
            </Button>
          </div>
        )}

        {/* Contract list */}
        <div className="space-y-3">
          {contracts && contracts.length > 0 ? (
            contracts.map((contract: RewardContract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span title={CHAIN_INFO[contract.chain_id].name}>
                      {CHAIN_INFO[contract.chain_id].icon}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {contract.label || t('crypto.unnamedContract')}
                    </span>
                    {contract.token_symbol && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                        {contract.token_symbol}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                    {contract.contract_address}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(t('crypto.confirmDeleteContract'))) {
                      deleteContractMutation.mutate(contract.id)
                    }
                  }}
                  className="text-red-600 hover:text-red-700 text-sm ml-4"
                >
                  {t('common.delete')}
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-center py-4">
              {t('crypto.noContracts')}
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
