/**
 * Data Freshness - Shows last sync timestamp
 */
import { useSyncStatus } from '../../contexts/SyncContext'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { getDateLocale } from '@/utils/formatDate'
import { Clock } from 'lucide-react'

interface DataFreshnessProps {
  className?: string
}

export function DataFreshness({ className = '' }: DataFreshnessProps) {
  const { lastSyncAt, isOnline } = useSyncStatus()
  const { t } = useTranslation()

  if (!lastSyncAt) return null

  const timeAgo = formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: getDateLocale() })

  // Data older than 24 hours is considered stale
  const isStale = Date.now() - lastSyncAt.getTime() > 24 * 60 * 60 * 1000

  return (
    <div
      className={`
        flex items-center gap-1 text-xs
        ${isStale ? 'text-orange-500 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}
        ${className}
      `}
    >
      <Clock size={12} aria-hidden="true" />
      <span>
        {t('sync.lastUpdated', 'Last updated')}: {timeAgo}
        {!isOnline && ` (${t('sync.offline', 'offline')})`}
      </span>
    </div>
  )
}
