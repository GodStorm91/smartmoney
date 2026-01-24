import { useTranslation } from 'react-i18next'
import { AlertTriangle, TrendingUp, Zap, X, Eye, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { SpendingPrediction } from '@/utils/spending-prediction'

interface PredictiveAlertProps {
  predictions: SpendingPrediction[]
  onViewCategory: (category: string) => void
  onAdjustBudget?: (category: string) => void
  onDismiss?: (category: string) => void
  maxAlerts?: number
  className?: string
}

export function PredictiveAlert({
  predictions,
  onViewCategory,
  onAdjustBudget,
  onDismiss,
  maxAlerts = 3,
  className
}: PredictiveAlertProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  // Limit to maxAlerts
  const displayPredictions = predictions.slice(0, maxAlerts)

  if (displayPredictions.length === 0) {
    return null
  }

  const getAlertConfig = (prediction: SpendingPrediction) => {
    if (prediction.anomalyDetected) {
      return {
        icon: Zap,
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        iconBg: 'bg-purple-100 dark:bg-purple-900/50',
        iconColor: 'text-purple-600 dark:text-purple-400',
        textColor: 'text-purple-800 dark:text-purple-200'
      }
    }
    if (prediction.status === 'danger') {
      return {
        icon: AlertTriangle,
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        iconBg: 'bg-red-100 dark:bg-red-900/50',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-800 dark:text-red-200'
      }
    }
    return {
      icon: TrendingUp,
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-800 dark:text-amber-200'
    }
  }

  const getConfidenceLabel = (confidence: 'high' | 'medium' | 'low') => {
    return t(`budget.forecast.confidence.${confidence}`)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displayPredictions.map((prediction) => {
        const config = getAlertConfig(prediction)
        const Icon = config.icon

        return (
          <Card
            key={prediction.category}
            className={cn(
              'p-4 border',
              config.bg,
              config.border
            )}
            role="alert"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn('p-2 rounded-lg flex-shrink-0', config.iconBg)}>
                <Icon className={cn('w-5 h-5', config.iconColor)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className={cn('font-semibold', config.textColor)}>
                      {prediction.anomalyDetected
                        ? t('budget.forecast.anomalyDetected')
                        : prediction.status === 'danger'
                          ? t('budget.forecast.predictedOverspend')
                          : t('budget.forecast.approachingLimit')}
                    </h4>
                    <p className={cn('text-sm mt-0.5', config.textColor, 'opacity-90')}>
                      {prediction.anomalyDetected
                        ? `${prediction.category}: ${prediction.anomalyDescription}`
                        : `${prediction.category} ${t('budget.forecast.willExceedBy')} ${formatCurrency(prediction.exceededBy)}`}
                    </p>
                  </div>

                  {/* Dismiss Button */}
                  {onDismiss && (
                    <button
                      onClick={() => onDismiss(prediction.category)}
                      className={cn(
                        'p-1 rounded hover:bg-black/5 dark:hover:bg-white/5',
                        config.textColor
                      )}
                      aria-label={t('button.close')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Details */}
                <div className={cn('flex items-center gap-4 mt-2 text-xs', config.textColor, 'opacity-80')}>
                  <span>
                    {t('budget.forecast.currentPace')}: {formatCurrency(prediction.dailyPace)}/day
                  </span>
                  <span>
                    {t('budget.forecast.safePace')}: {formatCurrency(prediction.safeDailyPace)}/day
                  </span>
                  <span>
                    {prediction.daysRemaining} {t('budget.daysLeft')}
                  </span>
                </div>

                {/* Confidence Badge */}
                <div className="mt-2">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    prediction.confidence === 'high'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : prediction.confidence === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  )}>
                    {t('budget.forecast.confidenceLabel')}: {getConfidenceLabel(prediction.confidence)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewCategory(prediction.category)}
                    className={config.textColor}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {t('viewDetails')}
                  </Button>
                  {onAdjustBudget && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAdjustBudget(prediction.category)}
                      className={config.textColor}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      {t('budget.forecast.adjustBudget')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )
      })}

      {/* Show count if more predictions exist */}
      {predictions.length > maxAlerts && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('budget.forecast.moreAlerts', { count: predictions.length - maxAlerts })}
        </p>
      )}
    </div>
  )
}
