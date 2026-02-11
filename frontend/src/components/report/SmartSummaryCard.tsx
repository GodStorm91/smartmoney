import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, AlertTriangle, TrendingUp, Sparkles, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { generateAISummary, fetchAISummary } from '@/services/report-service'
import type { MonthlyUsageReportData, AIReportSummary } from '@/types'

interface SmartSummaryCardProps {
  year: number
  month: number
  reportData: MonthlyUsageReportData
}

function buildFallback(report: MonthlyUsageReportData): AIReportSummary | null {
  const s = report.summary
  if (s.total_income === 0 && s.total_expense === 0) return null

  const win = s.expense_change < 0
    ? `Expenses decreased by ${Math.abs(s.expense_change).toFixed(1)}%`
    : s.savings_rate > 20
      ? `Savings rate at ${s.savings_rate.toFixed(1)}%`
      : `Income: ${s.total_income.toLocaleString()}`

  const warning = s.expense_change > 10
    ? `Expenses increased by ${s.expense_change.toFixed(1)}%`
    : s.savings_rate < 10
      ? `Low savings rate: ${s.savings_rate.toFixed(1)}%`
      : 'No major concerns this month'

  const trend = s.net_change > 0
    ? `Net cashflow improved by ${s.net_change.toFixed(1)}%`
    : s.net_change < 0
      ? `Net cashflow decreased by ${Math.abs(s.net_change).toFixed(1)}%`
      : 'Cashflow stable compared to last month'

  return { year: report.year, month: report.month, win, warning, trend, generated_at: '', is_cached: false, credits_used: 0 }
}

const bullets = [
  { key: 'win' as const, Icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  { key: 'warning' as const, Icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  { key: 'trend' as const, Icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
] as const

export function SmartSummaryCard({ year, month, reportData }: SmartSummaryCardProps) {
  const { t } = useTranslation('common')

  const { data: cached, refetch } = useQuery({
    queryKey: ['ai-summary', year, month],
    queryFn: () => fetchAISummary(year, month),
    staleTime: Infinity,
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: (force: boolean) => generateAISummary(year, month, undefined, force),
    onSuccess: () => { refetch() },
    onError: () => { toast.error(t('report.aiSummaryError')) },
  })

  const summary = cached ?? buildFallback(reportData)
  const isLoading = mutation.isPending
  const hasAI = !!cached

  if (!summary && !hasAI) {
    return (
      <Card className="p-4">
        <button
          onClick={() => mutation.mutate(false)}
          disabled={isLoading}
          className="flex items-center gap-2 w-full justify-center py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {t('report.generateSummary')}
          <span className="text-xs text-gray-400">~0.02 {t('report.credits')}</span>
        </button>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary-500" />
          {t('report.smartSummary')}
        </h3>
        <button
          onClick={() => mutation.mutate(true)}
          disabled={isLoading}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          {t('report.regenerate')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
      ) : (
        <div className="space-y-2.5">
          {bullets.map(({ key, Icon, color, bg }) => (
            <div key={key} className="flex items-start gap-2.5">
              <div className={`p-1 rounded-md ${bg} shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                {summary?.[key]}
              </p>
            </div>
          ))}
          {!hasAI && (
            <button
              onClick={() => mutation.mutate(false)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 mt-1"
            >
              <Sparkles className="w-3 h-3" />
              {t('report.generateAI')}
              <span className="text-gray-400">~0.02 {t('report.credits')}</span>
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
