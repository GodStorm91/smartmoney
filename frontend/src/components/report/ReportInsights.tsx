import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import type { ReportInsight } from '@/types'

interface ReportInsightsProps {
  insights: ReportInsight[]
}

export function ReportInsights({ insights }: ReportInsightsProps) {
  const { t } = useTranslation('common')

  if (insights.length === 0) return null

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {t('report.insights')}
      </h2>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {insight.title}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {insight.message}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
