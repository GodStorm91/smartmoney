/**
 * Sync Manager - Handles background sync and iOS fallback
 * Coordinates online/offline sync behavior
 */
import { processSyncQueue, getPendingCount } from './sync-queue'

let syncInterval: ReturnType<typeof setInterval> | null = null
let isProcessing = false

// Sync status listeners
type SyncStatusListener = (status: SyncStatus) => void
const listeners: Set<SyncStatusListener> = new Set()

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncAt: Date | null
  lastError: string | null
}

let currentStatus: SyncStatus = {
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
}

/**
 * Subscribe to sync status changes
 */
export function subscribeSyncStatus(listener: SyncStatusListener): () => void {
  listeners.add(listener)
  listener(currentStatus) // Emit current status immediately
  return () => listeners.delete(listener)
}

/**
 * Update and broadcast status
 */
function updateStatus(updates: Partial<SyncStatus>): void {
  currentStatus = { ...currentStatus, ...updates }
  listeners.forEach(listener => listener(currentStatus))
}

/**
 * Trigger sync process
 */
export async function triggerSync(): Promise<void> {
  if (isProcessing || !navigator.onLine) return

  isProcessing = true
  updateStatus({ isSyncing: true })

  try {
    const result = await processSyncQueue()
    const pendingCount = await getPendingCount()

    updateStatus({
      isSyncing: false,
      pendingCount,
      lastSyncAt: new Date(),
      lastError: result.failed > 0 ? `${result.failed} operations failed` : null,
    })
  } catch (error) {
    updateStatus({
      isSyncing: false,
      lastError: error instanceof Error ? error.message : 'Sync failed',
    })
  } finally {
    isProcessing = false
  }
}

/**
 * Initialize sync manager with iOS fallback
 */
export function initSyncManager(): void {
  // Update online status
  const handleOnline = async () => {
    updateStatus({ isOnline: true })
    await triggerSync()
  }

  const handleOffline = () => {
    updateStatus({ isOnline: false })
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // iOS Safari fallback: sync on visibility change (app resume)
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && navigator.onLine) {
      await triggerSync()
    }
  })

  // Periodic sync every 30s when online (fallback for browsers without BackgroundSync)
  syncInterval = setInterval(async () => {
    if (navigator.onLine) {
      const count = await getPendingCount()
      updateStatus({ pendingCount: count })
      if (count > 0) {
        await triggerSync()
      }
    }
  }, 30000)

  // Initial status update
  getPendingCount().then(count => updateStatus({ pendingCount: count }))
}

/**
 * Cleanup sync manager
 */
export function destroySyncManager(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...currentStatus }
}
