// Crypto wallet types

export type ChainId = 'eth' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error'

export interface CryptoWallet {
  id: number
  wallet_address: string
  label: string | null
  chains: ChainId[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CryptoWalletCreate {
  wallet_address: string
  label?: string
  chains?: ChainId[]
}

export interface CryptoWalletUpdate {
  label?: string
  chains?: ChainId[]
  is_active?: boolean
}

export interface CryptoSyncState {
  id: number
  wallet_address: string
  chain_id: ChainId
  last_sync_at: string | null
  last_balance_usd: number | null
  sync_status: SyncStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface CryptoWalletWithBalance extends CryptoWallet {
  total_balance_usd: number
  sync_statuses: CryptoSyncState[]
}

export interface RewardContract {
  id: number
  chain_id: ChainId
  contract_address: string
  label: string | null
  token_symbol: string | null
  token_decimals: number
  is_active: boolean
  created_at: string
}

export interface RewardContractCreate {
  chain_id: ChainId
  contract_address: string
  label?: string
  token_symbol?: string
  token_decimals?: number
}

export interface RewardContractUpdate {
  label?: string
  token_symbol?: string
  token_decimals?: number
  is_active?: boolean
}

export interface TokenBalance {
  chain_id: string
  token_address: string
  symbol: string
  name: string
  decimals: number
  balance: number
  balance_usd: number
  price_usd: number | null
  logo_url: string | null
}

export interface ChainBalance {
  chain_id: string
  chain_name: string
  total_usd: number
  native_balance: TokenBalance | null
  tokens: TokenBalance[]
}

export interface Portfolio {
  wallet_address: string
  total_balance_usd: number
  chains: ChainBalance[]
  last_sync_at: string | null
}

export interface RewardClaim {
  id: number
  wallet_address: string
  chain_id: ChainId
  tx_hash: string
  from_contract: string
  token_address: string | null
  token_symbol: string | null
  token_amount: number | null
  fiat_value: number | null
  fiat_currency: string
  token_price: number | null
  block_number: number | null
  block_timestamp: string | null
  transaction_id: number | null
  created_at: string
}

// Chain display info
export const CHAIN_INFO: Record<ChainId, { name: string; icon: string; color: string }> = {
  eth: { name: 'Ethereum', icon: '⟠', color: '#627EEA' },
  bsc: { name: 'BNB Chain', icon: '🔶', color: '#F3BA2F' },
  polygon: { name: 'Polygon', icon: '🟣', color: '#8247E5' },
  arbitrum: { name: 'Arbitrum', icon: '🔵', color: '#28A0F0' },
  optimism: { name: 'Optimism', icon: '🔴', color: '#FF0420' },
}
