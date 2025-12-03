/**
 * Hook to track online/offline status
 * Returns current network status and helpers
 */
import { useState, useEffect, useCallback } from 'react'

export interface OfflineStatus {
  isOnline: boolean
  isOffline: boolean
  lastOnlineAt: Date | null
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  )

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setLastOnlineAt(new Date())
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnlineAt,
  }
}
