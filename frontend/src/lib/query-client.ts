/**
 * TanStack Query Client Configuration
 * Configured for offline-first PWA behavior
 */
import { QueryClient } from '@tanstack/react-query'

// Query keys that should NOT be persisted (auth, sensitive data)
export const NON_PERSISTENT_KEYS = ['auth', 'user', 'session', 'credit']

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 24 hours (garbage collection time)
      gcTime: 1000 * 60 * 60 * 24,
      // Consider data stale after 5 minutes
      staleTime: 1000 * 60 * 5,
      // Retry failed requests twice
      retry: 2,
      // Don't refetch on window focus (saves API calls)
      refetchOnWindowFocus: false,
      // Offline-first: return cached data, fetch in background
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Offline-first for mutations too
      networkMode: 'offlineFirst',
    },
  },
})

// Helper to check if a query should be persisted
export function shouldPersistQuery(queryKey: unknown[]): boolean {
  const firstKey = queryKey[0]
  if (typeof firstKey !== 'string') return true
  return !NON_PERSISTENT_KEYS.includes(firstKey)
}
