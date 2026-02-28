/**
 * TanStack Query Client Configuration
 * Configured for offline-first PWA behavior
 */
import { QueryClient } from '@tanstack/react-query'

// Query keys that should NOT be persisted (frequently changing or sensitive data)
export const NON_PERSISTENT_KEYS = ['auth', 'user', 'session', 'credit', 'transactions', 'transfers', 'accounts', 'analytics', 'dashboard', 'recurring-transactions']

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 1 hour (garbage collection time)
      gcTime: 1000 * 60 * 60,
      // Data is stale immediately — always refetch on mount
      staleTime: 0,
      // Retry failed requests twice
      retry: 2,
      // Refetch when user returns to tab (catches external changes)
      refetchOnWindowFocus: 'always',
      // Online mode: fetch from network, no stale cache served
      networkMode: 'online',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      networkMode: 'online',
    },
  },
})

// Helper to check if a query should be persisted
export function shouldPersistQuery(queryKey: unknown[]): boolean {
  const firstKey = queryKey[0]
  if (typeof firstKey !== 'string') return true
  return !NON_PERSISTENT_KEYS.includes(firstKey)
}
