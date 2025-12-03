/**
 * Data Freshness - Shows last sync timestamp
 */
import { useSyncStatus } from '../../contexts/SyncContext'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { ja, vi, enUS, type Locale } from 'date-fns/locale'
import { Clock } from 'lucide-react'

const localeMap: Record<string, Locale> = {
  ja,
  vi,
  en: enUS,
}

interface DataFreshnessProps {
  className?: string
}

export function DataFreshness({ className = '' }: DataFreshnessProps) {
  const { lastSyncAt, isOnline } = useSyncStatus()
  const { t, i18n } = useTranslation()

  if (!lastSyncAt) return null

  const locale = localeMap[i18n.language] || enUS
  const timeAgo = formatDistanceToNow(lastSyncAt, { addSuffix: true, locale })

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
