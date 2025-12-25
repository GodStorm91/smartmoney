/**
 * IndexedDB Types for SmartMoney Offline Storage
 * Mirrors backend models with offline tracking fields
 */

// Offline tracking metadata added to all entities
export interface OfflineMetadata {
  synced_at?: string // ISO timestamp of last server sync
  pending_sync?: boolean // True if changes need to sync
  local_id?: string // UUID for offline-created items
}

// Transaction entity for IndexedDB
export interface DBTransaction extends OfflineMetadata {
  id: number
  date: string // ISO 8601 (YYYY-MM-DD)
  description: string
  amount: number // Stored in cents (integer)
  category: string
  source: string
  type: 'income' | 'expense'
  account_id?: number
  created_at: string
  updated_at?: string
}

// Account entity for IndexedDB
export interface DBAccount extends OfflineMetadata {
  id: number
  name: string
  type: 'bank' | 'cash' | 'credit_card' | 'investment' | 'receivable' | 'other'
  initial_balance: number
  initial_balance_date: string
  is_active: boolean
  currency: string
  notes?: string
  created_at: string
  updated_at: string
}

// Budget allocation within a budget
export interface DBBudgetAllocation {
  category: string
  amount: number
  reasoning?: string
}

// Budget entity for IndexedDB
export interface DBBudget extends OfflineMetadata {
  id: number
  month: string // Format: YYYY-MM
  monthly_income: number
  savings_target?: number
  advice?: string
  allocations: DBBudgetAllocation[]
  created_at: string
  updated_at?: string
}

// Goal type enum
export type DBGoalType =
  | 'emergency_fund'
  | 'home_down_payment'
  | 'vacation_travel'
  | 'vehicle'
  | 'education'
  | 'wedding'
  | 'large_purchase'
  | 'debt_payoff'
  | 'retirement'
  | 'investment'
  | 'custom'

// Goal entity for IndexedDB
export interface DBGoal extends OfflineMetadata {
  id: number
  goal_type: DBGoalType
  name?: string
  years: number
  target_amount: number
  start_date?: string
  priority: number
  account_id?: number
  ai_advice?: string
  milestone_25_at?: string
  milestone_50_at?: string
  milestone_75_at?: string
  milestone_100_at?: string
  created_at?: string
  updated_at?: string
}

// Sync operation types
export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE'
export type SyncEntityType = 'transaction' | 'account' | 'budget' | 'goal'

// Sync queue entry for offline mutations
export interface SyncOperation {
  id?: number // Auto-increment
  operation_type: SyncOperationType
  entity_type: SyncEntityType
  entity_id: number | string // number for existing, string UUID for new
  payload: Record<string, unknown>
  timestamp: number // Epoch ms
  retry_count: number
  last_error?: string
  status: 'pending' | 'processing' | 'failed'
}

// App metadata for tracking sync state
export interface AppMeta {
  id: string // 'app-state'
  last_full_sync?: string // ISO timestamp
  schema_version: number
  user_id?: number
}
