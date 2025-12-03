/**
 * Sync Status Bar - Shows offline/syncing/synced state
 * Fixed position in top-right corner
 */
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useSyncStatus } from '../../contexts/SyncContext'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'

export function SyncStatusBar() {
  const { isOnline, isSyncing, pendingCount, lastError } = useSyncStatus()
  const { t } = useTranslation()
  const [showSuccess, setShowSuccess] = useState(false)

  // Auto-hide success state after 3 seconds
  useEffect(() => {
    if (isOnline && !isSyncing && pendingCount === 0 && !lastError) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, isSyncing, pendingCount, lastError])

  // Hide when online, not syncing, no pending, and success timeout passed
  if (isOnline && !isSyncing && pendingCount === 0 && !showSuccess && !lastError) {
    return null
  }

  const getStatusStyles = () => {
    if (!isOnline) return 'bg-gray-600 dark:bg-gray-700'
    if (lastError) return 'bg-red-500 dark:bg-red-600'
    if (isSyncing) return 'bg-blue-500 dark:bg-blue-600'
    return 'bg-green-500 dark:bg-green-600'
  }

  return (
    <div className="fixed top-4 right-4 z-[9999]" role="status" aria-live="polite">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
        ${getStatusStyles()}
        text-white text-sm font-medium
        transition-all duration-300 ease-in-out
      `}>
        {!isOnline && (
          <>
            <WifiOff size={16} aria-hidden="true" />
            <span>{t('sync.offline', 'Offline')}</span>
            {pendingCount > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                {pendingCount}
              </span>
            )}
          </>
        )}

        {isOnline && lastError && (
          <>
            <AlertCircle size={16} aria-hidden="true" />
            <span>{t('sync.error', 'Sync error')}</span>
          </>
        )}

        {isOnline && isSyncing && (
          <>
            <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
            <span>
              {t('sync.syncing', 'Syncing')}
              {pendingCount > 0 && ` (${pendingCount})`}
            </span>
          </>
        )}

        {isOnline && !isSyncing && !lastError && showSuccess && (
          <>
            <CheckCircle size={16} aria-hidden="true" />
            <span>{t('sync.synced', 'All synced')}</span>
          </>
        )}
      </div>
    </div>
  )
}
