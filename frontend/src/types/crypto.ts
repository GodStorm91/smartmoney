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

// DeFi/LP Position types
export interface DefiPosition {
  id: string
  chain_id: string
  protocol: string
  protocol_id: string
  protocol_module: string  // liquidity_pool, staking, lending
  position_type: string    // deposit, stake, borrow, reward
  name: string
  symbol: string
  token_name: string
  balance: number
  balance_usd: number
  price_usd: number | null
  logo_url: string | null
}

export interface DefiPositionsResponse {
  wallet_address: string
  total_value_usd: number
  positions: DefiPosition[]
  last_sync_at: string | null
}

// Position snapshot for historical tracking
export interface DefiPositionSnapshot {
  id: number
  position_id: string
  protocol: string
  chain_id: string
  position_type: string
  symbol: string
  token_name: string | null
  balance: number
  balance_usd: number
  price_usd: number | null
  protocol_apy: number | null
  snapshot_date: string
}

// Position history with performance metrics
export interface PositionHistory {
  position_id: string
  protocol: string
  symbol: string
  current_value_usd: number
  snapshots: DefiPositionSnapshot[]
  change_7d_usd: number | null
  change_7d_pct: number | null
  change_30d_usd: number | null
  change_30d_pct: number | null
}

// Position performance with IL metrics
export interface PositionPerformance {
  position_id: string
  protocol: string
  symbol: string
  days_held: number
  start_value_usd: number
  current_value_usd: number
  total_return_usd: number
  total_return_pct: number
  annualized_return_pct: number
  current_apy: number | null
  snapshot_count: number
  // IL metrics
  il_percentage: number | null
  il_usd: number | null
  hodl_value_usd: number | null
  lp_vs_hodl_usd: number | null
  lp_outperformed_hodl: boolean | null
  // Yield estimates
  estimated_yield_usd: number | null
  estimated_yield_pct: number | null
}

// AI-generated position insights
export interface PositionInsights {
  summary: string
  il_analysis: string | null
  observation: string
  scenario_up: string | null
  scenario_down: string | null
  risk_level: 'low' | 'medium' | 'high'
  recommendation: string | null
}

// AI-generated portfolio insights
export interface PortfolioInsights {
  diversification_score: 'well-diversified' | 'moderate' | 'concentrated'
  diversification_analysis: string
  risk_observations: string[]
  considerations: string[]
  overall_assessment: string
}

// IL scenario for educational display
export interface ILScenario {
  price_change: string
  price_ratio: number
  il_percentage: number
  vs_hodl: string
}

// Position Reward types
export interface PositionReward {
  id: number
  position_id: string | null
  wallet_address: string
  chain_id: string
  reward_token_address: string
  reward_token_symbol: string | null
  reward_amount: number
  reward_usd: number | null
  claimed_at: string
  tx_hash: string
  block_number: number | null
  source: 'merkl' | 'direct' | 'manual'
  merkl_campaign_id: string | null
  is_attributed: boolean
  created_at: string
}

export interface RewardsScanResult {
  scanned_claims: number
  new_claims: number
  matched: number
  unmatched: number
}

export interface TokenTotal {
  symbol: string
  amount: number
  amount_usd: number | null
}

export interface MonthlyRewardTotal {
  month: string // YYYY-MM format
  symbol: string
  amount: number
  amount_usd: number | null
  count: number
}

export interface PositionROI {
  position_id: string
  current_value_usd: number
  cost_basis_usd: number | null
  total_rewards_usd: number
  rewards_count: number
  rewards_by_token: TokenTotal[]
  rewards_by_month: MonthlyRewardTotal[]
  simple_roi_pct: number | null
  annualized_roi_pct: number | null
  days_held: number | null
}

export interface PositionCostBasisCreate {
  position_id: string
  wallet_address: string
  chain_id?: string
  vault_address: string
  total_usd: number
  deposited_at: string
  tx_hash: string
  token_a_symbol?: string
  token_a_amount?: number
  token_b_symbol?: string
  token_b_amount?: number
}

export interface PositionCostBasis {
  id: number
  position_id: string
  wallet_address: string
  chain_id: string
  vault_address: string
  token_a_symbol: string | null
  token_a_amount: number | null
  token_b_symbol: string | null
  token_b_amount: number | null
  total_usd: number
  deposited_at: string
  tx_hash: string
  created_at: string
}

// HODL Scenarios
export interface HodlScenarioItem {
  name: string
  symbol: string
  type: 'single_token' | 'hodl_balanced' | 'lp'
  value_usd: number
  return_pct: number
  return_usd: number
}

export interface HodlScenariosResponse {
  initial_date: string
  current_date: string
  days_held: number
  initial_value_usd: number
  tokens: string[]
  scenarios: HodlScenarioItem[]
  winner: string | null
  winner_vs_lp_usd: number
}

// Chain display info
export const CHAIN_INFO: Record<ChainId, { name: string; icon: string; color: string }> = {
  eth: { name: 'Ethereum', icon: '⟠', color: '#627EEA' },
  bsc: { name: 'BNB Chain', icon: '🔶', color: '#F3BA2F' },
  polygon: { name: 'Polygon', icon: '🟣', color: '#8247E5' },
  arbitrum: { name: 'Arbitrum', icon: '🔵', color: '#28A0F0' },
  optimism: { name: 'Optimism', icon: '🔴', color: '#FF0420' },
}
