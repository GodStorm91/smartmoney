/**
 * Sync Context - Provides sync status to components
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  initSyncManager,
  destroySyncManager,
  subscribeSyncStatus,
  triggerSync as doTriggerSync,
  type SyncStatus,
} from '../lib/sync-manager'

interface SyncContextValue extends SyncStatus {
  triggerSync: () => Promise<void>
}

const defaultStatus: SyncStatus = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
}

const SyncContext = createContext<SyncContextValue>({
  ...defaultStatus,
  triggerSync: async () => {},
})

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>(defaultStatus)

  useEffect(() => {
    // Initialize sync manager
    initSyncManager()

    // Subscribe to status updates
    const unsubscribe = subscribeSyncStatus(setStatus)

    return () => {
      unsubscribe()
      destroySyncManager()
    }
  }, [])

  const triggerSync = useCallback(async () => {
    await doTriggerSync()
  }, [])

  return (
    <SyncContext.Provider value={{ ...status, triggerSync }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncStatus(): SyncContextValue {
  return useContext(SyncContext)
}

export { SyncContext }
