import { useQuery } from '@tanstack/react-query'
import { getLiveInsights } from '@/services/insight-service'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Lightbulb, TrendingUp, AlertTriangle, Target, Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface InsightCardListProps {
  limit?: number
  showHeader?: boolean
}

export function InsightCardList({ limit = 5, showHeader = true }: InsightCardListProps) {
  const { t } = useTranslation('common')

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['liveInsights', limit],
    queryFn: () => getLiveInsights(limit),
  })

  const getPriorityColor = (priority: number): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    if (priority <= 1) return 'error'
    if (priority <= 2) return 'warning'
    if (priority <= 3) return 'info'
    return 'success'
  }

  const getPriorityLabel = (priority: number) => {
    if (priority <= 1) return t('anomaly.severity.critical')
    if (priority <= 2) return t('anomaly.severity.high')
    if (priority <= 3) return t('anomaly.severity.medium')
    return t('anomaly.severity.low')
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      spending_trend: <TrendingUp className="w-5 h-5" />,
      budget_warning: <AlertTriangle className="w-5 h-5" />,
      budget_info: <Lightbulb className="w-5 h-5" />,
      goal_progress: <Target className="w-5 h-5" />,
      forecast: <Sparkles className="w-5 h-5" />,
      savings_alert: <AlertTriangle className="w-5 h-5" />,
      savings_positive: <TrendingUp className="w-5 h-5" />,
    }
    return icons[type] || <Lightbulb className="w-5 h-5" />
  }

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      spending_trend: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      budget_warning: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      budget_info: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      goal_progress: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      forecast: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      savings_alert: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      savings_positive: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    }
    return colors[type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('insights.title', 'Insights')}</h3>
          </div>
        )}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </Card>
        ))}
      </div>
    )
  }

  if (error || !result) {
    return (
      <Card className="p-4 text-center text-gray-500">
        {t('common.noData')}
      </Card>
    )
  }

  const { insights } = result

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{t('insights.title', 'Insights')}</h3>
            {insights.length > 0 && (
              <Badge variant="info">{insights.length}</Badge>
            )}
          </div>
        </div>
      )}

      {insights.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{t('analytics.noInsights', 'No notable spending patterns detected')}</p>
          <p className="text-xs mt-1">{t('analytics.insightsHint', 'Keep tracking to see personalized insights')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <Card
              key={`${insight.type}-${insight.title}`}
              className={cn(
                'p-4 transition-all hover:shadow-md',
                insight.priority <= 2 && 'border-l-4 border-l-red-500'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', getTypeColor(insight.type))}>
                  {getTypeIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getPriorityColor(insight.priority)}>
                      {getPriorityLabel(insight.priority)}
                    </Badge>
                    <span className="text-xs text-gray-500 capitalize">
                      {insight.type.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {insight.message}
                  </p>
                  {insight.action_url && (
                    <Link to={insight.action_url as any}>
                      <span className="inline-flex items-center gap-1 mt-2 text-sm text-primary-600 hover:text-primary-700 cursor-pointer">
                        {insight.action_label || t('analytics.learnMore', 'Learn More')}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
