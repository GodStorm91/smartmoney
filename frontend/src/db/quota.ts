/**
 * IndexedDB Storage Quota Management
 * Handles storage estimation and cleanup of old data
 */
import { db } from './db'

export interface StorageEstimate {
  usage: number
  quota: number
  percentUsed: number
}

/**
 * Check current IndexedDB storage usage
 * Returns zeros if Storage API not available
 */
export async function checkStorageQuota(): Promise<StorageEstimate> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 0
      return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      }
    } catch (error) {
      console.warn('Storage estimate failed:', error)
    }
  }
  return { usage: 0, quota: 0, percentUsed: 0 }
}

/**
 * Delete transactions older than specified days
 * Returns count of deleted records
 */
export async function cleanupOldTransactions(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)
  const isoDate = cutoffDate.toISOString().split('T')[0]

  return await db.transactions.where('date').below(isoDate).delete()
}

/**
 * Clear all synced operations from queue (completed sync)
 */
export async function cleanupSyncQueue(): Promise<number> {
  // Clear operations that have been successfully synced or failed permanently
  return await db.sync_queue.where('status').equals('failed').delete()
}

/**
 * Get approximate storage size by entity type
 */
export async function getStorageBreakdown(): Promise<{
  transactions: number
  accounts: number
  budgets: number
  goals: number
  syncQueue: number
}> {
  const [transactions, accounts, budgets, goals, syncQueue] = await Promise.all([
    db.transactions.count(),
    db.accounts.count(),
    db.budgets.count(),
    db.goals.count(),
    db.sync_queue.count(),
  ])

  // Rough estimates: tx~500B, account~200B, budget~1KB, goal~300B, sync~200B
  return {
    transactions: transactions * 500,
    accounts: accounts * 200,
    budgets: budgets * 1000,
    goals: goals * 300,
    syncQueue: syncQueue * 200,
  }
}

/**
 * Request persistent storage to prevent browser cleanup
 * Returns true if granted (requires user gesture on some browsers)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      return await navigator.storage.persist()
    } catch (error) {
      console.warn('Persistent storage request failed:', error)
    }
  }
  return false
}

/**
 * Check if storage is persistent
 */
export async function isStoragePersistent(): Promise<boolean> {
  if ('storage' in navigator && 'persisted' in navigator.storage) {
    try {
      return await navigator.storage.persisted()
    } catch {
      return false
    }
  }
  return false
}
