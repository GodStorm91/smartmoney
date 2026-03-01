import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import type { LiveInsight } from '@/services/insight-service'

const MAX_VISIBLE = 5

const severityConfig = {
  1: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100/80 dark:bg-amber-900/20' },
  2: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100/80 dark:bg-amber-900/20' },
  3: { icon: Info, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100/80 dark:bg-primary-900/20' },
  4: { icon: CheckCircle, color: 'text-income-600 dark:text-income-400', bg: 'bg-income-100/80 dark:bg-income-900/20' },
  5: { icon: Info, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
} as const

interface InsightCardsProps {
  insights: LiveInsight[]
}

export function InsightCards({ insights }: InsightCardsProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()
  const [expanded, setExpanded] = useState(false)

  if (!insights || insights.length === 0) return null

  const visible = expanded ? insights : insights.slice(0, MAX_VISIBLE)
  const hasMore = insights.length > MAX_VISIBLE

  const formatAmount = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('insights.title', 'Insights')}
          </h3>
        </div>
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em]">
          {insights.length} {t('insights.items', 'items')}
        </span>
      </div>

      <div className="space-y-2">
        {visible.map((insight, idx) => {
          const priority = insight.priority as keyof typeof severityConfig
          const config = severityConfig[priority] || severityConfig[3]
          const Icon = config.icon
          const amount = insight.data?.current as number | undefined

          return (
            <div
              key={`${insight.type}-${idx}`}
              className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 animate-stagger-in"
              style={{ '--stagger-index': idx } as React.CSSProperties}
            >
              <div className={cn('p-1.5 rounded-xl shrink-0 mt-0.5', config.bg)}>
                <Icon className={cn('w-3.5 h-3.5', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug">
                  {insight.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {insight.message}
                </p>
              </div>
              {amount != null && amount > 0 && (
                <span className="text-xs font-bold font-numbers text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                  {formatAmount(amount)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-1 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg transition-colors"
        >
          {expanded ? (
            <>
              {t('insights.showLess', 'Show less')}
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              {t('insights.viewAll', 'View all')} ({insights.length})
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </Card>
  )
}
