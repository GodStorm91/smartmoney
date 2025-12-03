/**
 * SmartMoney IndexedDB Module
 * Provides offline data storage and sync queue management
 */

// Database instance and initialization
export { db, SmartMoneyDB, initializeDB, clearAllData, getDBInfo, isIndexedDBAvailable } from './db'

// All CRUD operations
export * from './operations'

// Storage quota management
export * from './quota'

// Types
export type {
  DBTransaction,
  DBAccount,
  DBBudget,
  DBBudgetAllocation,
  DBGoal,
  SyncOperation,
  SyncOperationType,
  SyncEntityType,
  AppMeta,
  OfflineMetadata,
} from './types'
