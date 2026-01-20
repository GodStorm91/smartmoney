import { useQuery } from '@tanstack/react-query'
import { getLiveRecommendations } from '@/services/savings-service'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useTranslation } from 'react-i18next'
import {
  Lightbulb,
  CreditCard,
  TrendingDown,
  Phone,
  Wifi,
  Shield,
  PiggyBank
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface SavingsRecommendationsProps {
  limit?: number
  showHeader?: boolean
}

export function SavingsRecommendations({
  limit = 5,
  showHeader = true,
}: SavingsRecommendationsProps) {
  const { t } = useTranslation('common')

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['liveSavingsRecommendations', limit],
    queryFn: () => getLiveRecommendations(limit),
  })

  const getActionTypeIcon = (actionType: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      subscription_cancel: <CreditCard className="w-5 h-5" />,
      reduce_spending: <TrendingDown className="w-5 h-5" />,
      negotiate: <Phone className="w-5 h-5" />,
      switch_provider: <Wifi className="w-5 h-5" />,
      optimize_payment: <Shield className="w-5 h-5" />,
    }
    return icons[actionType] || <Lightbulb className="w-5 h-5" />
  }

  const getActionTypeColor = (actionType: string): string => {
    const colors: Record<string, string> = {
      subscription_cancel: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      reduce_spending: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      negotiate: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      switch_provider: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      optimize_payment: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    }
    return colors[actionType] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {t('savings.title', 'Savings Opportunities')}
            </h3>
          </div>
        )}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded" />
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

  const { recommendations } = result

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">
              {t('savings.title', 'Savings Opportunities')}
            </h3>
            {recommendations.length > 0 && (
              <Badge variant="success">
                {formatCurrency(result.total_potential)} {t('savings.potential', 'potential')}
              </Badge>
            )}
          </div>
        </div>
      )}

      {recommendations.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{t('savings.noRecommendations', 'No savings opportunities found')}</p>
          <p className="text-xs mt-1">
            {t('savings.checkBack', 'Check back later for personalized suggestions')}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
            <Card
              key={idx}
              className="p-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-2 rounded-lg', getActionTypeColor(rec.action_type))}>
                  {getActionTypeIcon(rec.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-xs">
                      {rec.category}
                    </Badge>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      +{formatCurrency(rec.potential_savings)}
                    </span>
                  </div>
<h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {rec.recommendation}
                    </h4>
                    {rec.action_data && 'suggestion' in rec.action_data && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {String(rec.action_data.suggestion)}
                      </p>
                    )}
                </div>
              </div>
            </Card>
          ))}

          {result.total_potential > 0 && (
            <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {t('savings.totalPotential', 'Total Potential Savings')}
                  </span>
                </div>
                <span className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(result.total_potential)}
                </span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
