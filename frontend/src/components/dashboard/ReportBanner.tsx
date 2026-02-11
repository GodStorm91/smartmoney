import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { X, FileText, ArrowRight } from 'lucide-react'
import { fetchAISummary } from '@/services/report-service'
import { cn } from '@/utils/cn'

interface ReportBannerProps {
  className?: string
}

function getPreviousMonth() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 }
}

function getMonthName(month: number, locale: string) {
  return new Date(2026, month - 1, 1).toLocaleString(locale, { month: 'long' })
}

export function ReportBanner({ className }: ReportBannerProps) {
  const { t, i18n } = useTranslation('common')
  const today = new Date()
  const dayOfMonth = today.getDate()
  const { year, month } = getPreviousMonth()
  const dismissKey = `report-banner-dismissed-${year}-${month}`

  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === '1' } catch { return false }
  })

  const shouldShow = dayOfMonth <= 7 && !dismissed

  const { data: aiSummary } = useQuery({
    queryKey: ['ai-summary', year, month],
    queryFn: () => fetchAISummary(year, month),
    enabled: shouldShow,
    retry: false,
    staleTime: Infinity,
  })

  if (!shouldShow) return null

  const monthName = getMonthName(month, i18n.language)
  const insight = aiSummary?.win ?? t('report.bannerFallback', { month: monthName })

  const handleDismiss = () => {
    try { localStorage.setItem(dismissKey, '1') } catch { /* noop */ }
    setDismissed(true)
  }

  return (
    <div
      className={cn(
        'relative rounded-xl p-4 bg-gradient-to-r from-primary-500/10 to-primary-500/5',
        'border border-primary-200 dark:border-primary-800',
        'animate-slide-in-top',
        className,
      )}
    >
      <button
        onClick={handleDismiss}
        aria-label={t('report.bannerDismiss')}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 shrink-0">
          <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            {t('report.bannerTitle', { month: monthName })}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {insight}
          </p>
          <Link
            to="/analytics"
            search={{ tab: 'report' }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {t('report.bannerCta')}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
