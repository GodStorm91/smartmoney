/**
 * Collapsible "AI Tools" panel on the Analytics page.
 * Contains AICategoryCleanup and SpendingInsights.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, ChevronDown } from 'lucide-react'
import { SpendingInsights } from '@/components/analytics/SpendingInsights'
import { AICategoryCleanup } from '@/components/analytics/AICategoryCleanup'
import { cn } from '@/utils/cn'

export function AnalyticsAiToolsSection() {
  const { t } = useTranslation('common')
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full px-4 py-3.5 flex items-center justify-between',
          'bg-gray-50/80 dark:bg-gray-800/80',
          'text-left font-semibold text-gray-900 dark:text-gray-100'
        )}
      >
        <span className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          {t('analytics.aiTools')}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-500 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>
      {expanded && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          <AICategoryCleanup />
          <SpendingInsights />
        </div>
      )}
    </div>
  )
}
