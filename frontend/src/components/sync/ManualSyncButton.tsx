/**
 * Manual Sync Button - For iOS Safari users (no BackgroundSync API)
 */
import { RefreshCw } from 'lucide-react'
import { useSyncStatus } from '../../contexts/SyncContext'
import { useTranslation } from 'react-i18next'

interface ManualSyncButtonProps {
  className?: string
  showWhenEmpty?: boolean
}

export function ManualSyncButton({
  className = '',
  showWhenEmpty = false,
}: ManualSyncButtonProps) {
  const { triggerSync, isSyncing, pendingCount, isOnline } = useSyncStatus()
  const { t } = useTranslation()

  // Hide when offline or no pending operations (unless showWhenEmpty)
  if (!isOnline || (!showWhenEmpty && pendingCount === 0)) {
    return null
  }

  return (
    <button
      onClick={triggerSync}
      disabled={isSyncing || !isOnline}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 text-sm
        bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400
        border border-blue-200 dark:border-blue-800
        rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${className}
      `}
      aria-label={t('sync.syncNow', 'Sync now')}
    >
      <RefreshCw
        size={14}
        className={isSyncing ? 'animate-spin' : ''}
        aria-hidden="true"
      />
      <span>
        {isSyncing
          ? t('sync.syncing', 'Syncing...')
          : pendingCount > 0
            ? t('sync.syncPending', 'Sync {{count}} pending', { count: pendingCount })
            : t('sync.syncNow', 'Sync now')
        }
      </span>
    </button>
  )
}
