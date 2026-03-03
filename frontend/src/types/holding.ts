export type AssetType = 'commodity' | 'stock' | 'etf' | 'bond' | 'crypto' | 'other'
export type LotType = 'buy' | 'sell' | 'dividend'

export interface Holding {
  id: number
  user_id: number
  account_id: number | null
  asset_name: string
  asset_type: AssetType
  ticker: string | null
  unit_label: string
  currency: string
  total_units: string  // Decimal as string from API
  total_cost_basis: number
  current_price_per_unit: number | null
  current_price_date: string | null  // ISO date
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed by backend
  avg_cost_per_unit: number
  current_value: number | null
  unrealized_pnl: number | null
  pnl_percentage: number | null
}

export interface HoldingLot {
  id: number
  holding_id: number
  type: LotType
  date: string
  units: string  // Decimal as string
  price_per_unit: number
  total_amount: number
  fee_amount: number | null
  notes: string | null
  created_at: string
}

export interface HoldingWithLots extends Holding {
  lots: HoldingLot[]
}

export interface HoldingCreate {
  asset_name: string
  asset_type: AssetType
  ticker?: string
  unit_label: string
  currency: string
  account_id?: number
  notes?: string
}

export interface HoldingUpdate {
  asset_name?: string
  asset_type?: AssetType
  ticker?: string
  unit_label?: string
  current_price_per_unit?: number
  current_price_date?: string
  notes?: string
  is_active?: boolean
}

export interface LotCreate {
  type: LotType
  date: string
  units: string
  price_per_unit: number
  total_amount: number
  fee_amount?: number
  notes?: string
}

export interface PortfolioSummary {
  total_value: number
  total_cost: number
  total_pnl: number
  pnl_percentage: number
  holdings_count: number
}
