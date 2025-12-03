/**
 * TanStack Query IndexedDB Persister
 * Stores query cache in IndexedDB for offline access
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { db } from '../db'

const CACHE_KEY = 'tanstack-query-cache'

// Storage adapter using Dexie (our existing IndexedDB)
const indexedDBStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const meta = await db.app_meta.get(key)
      return meta ? JSON.stringify(meta) : null
    } catch (error) {
      console.warn('Failed to read from IndexedDB:', error)
      return null
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value)
      await db.app_meta.put({ id: key, ...parsed })
    } catch (error) {
      console.warn('Failed to write to IndexedDB:', error)
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await db.app_meta.delete(key)
    } catch (error) {
      console.warn('Failed to remove from IndexedDB:', error)
    }
  },
}

// Create persister with throttling to avoid excessive writes
export const persister = createAsyncStoragePersister({
  storage: indexedDBStorage,
  throttleTime: 10000, // Write max every 10 seconds
  key: CACHE_KEY,
})

// Clear persisted cache (call on logout)
export async function clearPersistedCache(): Promise<void> {
  await indexedDBStorage.removeItem(CACHE_KEY)
}
