/**
 * SmartMoney IndexedDB Database Definition
 * Uses Dexie.js for offline data persistence
 */
import Dexie, { type Table } from 'dexie'
import type {
  DBTransaction,
  DBAccount,
  DBBudget,
  DBGoal,
  SyncOperation,
  AppMeta,
} from './types'

const DB_NAME = 'smartmoney-db'
const DB_VERSION = 1

export class SmartMoneyDB extends Dexie {
  // Table declarations
  transactions!: Table<DBTransaction, number>
  accounts!: Table<DBAccount, number>
  budgets!: Table<DBBudget, number>
  goals!: Table<DBGoal, number>
  sync_queue!: Table<SyncOperation, number>
  app_meta!: Table<AppMeta, string>

  constructor() {
    super(DB_NAME)

    // Schema version 1
    this.version(DB_VERSION).stores({
      // Transactions: indexed for date range, category, account queries
      transactions: '++id, date, category, source, type, account_id, [date+category], [date+account_id]',
      // Accounts: indexed for user lookup
      accounts: '++id, name, type, is_active, currency',
      // Budgets: indexed for month lookup
      budgets: '++id, month',
      // Goals: indexed for status and date queries
      goals: '++id, status, end_date',
      // Sync queue: indexed for processing order
      sync_queue: '++id, timestamp, retry_count, status, entity_type',
      // App metadata: keyed by string id
      app_meta: 'id',
    })
  }
}

// Singleton database instance
export const db = new SmartMoneyDB()

// Helper to check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

// Initialize database and verify it's working
export async function initializeDB(): Promise<boolean> {
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available in this browser')
    return false
  }

  try {
    await db.open()
    // Initialize app_meta if not exists
    const meta = await db.app_meta.get('app-state')
    if (!meta) {
      await db.app_meta.put({
        id: 'app-state',
        schema_version: DB_VERSION,
      })
    }
    return true
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error)
    return false
  }
}

// Clear all data (for logout)
export async function clearAllData(): Promise<void> {
  await db.transactions.clear()
  await db.accounts.clear()
  await db.budgets.clear()
  await db.goals.clear()
  await db.sync_queue.clear()
}

// Get database info for debugging
export async function getDBInfo(): Promise<{
  transactionCount: number
  accountCount: number
  budgetCount: number
  goalCount: number
  pendingSyncCount: number
}> {
  const [transactionCount, accountCount, budgetCount, goalCount, pendingSyncCount] =
    await Promise.all([
      db.transactions.count(),
      db.accounts.count(),
      db.budgets.count(),
      db.goals.count(),
      db.sync_queue.where('status').equals('pending').count(),
    ])

  return {
    transactionCount,
    accountCount,
    budgetCount,
    goalCount,
    pendingSyncCount,
  }
}
