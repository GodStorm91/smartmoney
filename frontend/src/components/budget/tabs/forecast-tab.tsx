import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PredictiveAlert } from '../predictive-alert'
import { generatePredictions, calculateBudgetForecast } from '@/utils/spending-prediction'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'
import type { Budget, BudgetTracking } from '@/types'

interface ForecastTabProps {
  budget: Budget
  tracking?: BudgetTracking
  selectedMonth: string
  onViewCategory: (category: string) => void
  onAdjustBudget?: (category: string) => void
}

export function ForecastTab({
  budget,
  tracking,
  selectedMonth,
  onViewCategory,
  onAdjustBudget
}: ForecastTabProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, true, isPrivacyMode)

  const predictions = useMemo(() => {
    if (!tracking) return []
    return generatePredictions(budget.allocations, tracking)
  }, [budget.allocations, tracking])

  const forecast = useMemo(() => {
    if (!tracking) return null
    return calculateBudgetForecast(tracking)
  }, [tracking])

  if (!tracking) {
    return (
      <Card className="p-8 text-center text-gray-500">
        {t('budget.forecast.noData')}
      </Card>
    )
  }

  const hasWarnings = predictions.length > 0

  return (
    <div className="space-y-6">
      {/* Overall Forecast Summary */}
      {forecast && (
        <Card className={cn(
          'p-6 border-2',
          forecast.overallStatus === 'danger' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
          forecast.overallStatus === 'warning' ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' :
          'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center',
              forecast.overallStatus === 'danger' ? 'bg-red-500' :
              forecast.overallStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500'
            )}>
              {forecast.overallStatus === 'danger' ? (
                <AlertTriangle className="w-7 h-7 text-white" />
              ) : forecast.overallStatus === 'warning' ? (
                <TrendingUp className="w-7 h-7 text-white" />
              ) : (
                <CheckCircle className="w-7 h-7 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={cn(
                'text-lg font-bold',
                forecast.overallStatus === 'danger' ? 'text-red-800 dark:text-red-200' :
                forecast.overallStatus === 'warning' ? 'text-amber-800 dark:text-amber-200' :
                'text-green-800 dark:text-green-200'
              )}>
                {forecast.overallStatus === 'danger' ? t('budget.forecast.overBudgetProjected') :
                 forecast.overallStatus === 'warning' ? t('budget.forecast.approachingLimit') :
                 t('budget.forecast.onTrack')}
              </h3>
              <p className={cn(
                'text-sm mt-0.5',
                forecast.overallStatus === 'danger' ? 'text-red-700 dark:text-red-300' :
                forecast.overallStatus === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                'text-green-700 dark:text-green-300'
              )}>
                {t('budget.forecast.projectedSpending', {
                  amount: formatCurrency(forecast.totalPredicted),
                  budget: formatCurrency(forecast.totalBudget)
                })}
              </p>
            </div>
            <div className="text-right">
              <p className={cn(
                'text-3xl font-bold',
                forecast.overallStatus === 'danger' ? 'text-red-600 dark:text-red-400' :
                forecast.overallStatus === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                'text-green-600 dark:text-green-400'
              )}>
                {Math.round(forecast.overallPercent)}%
              </p>
              <p className="text-xs text-gray-500">{t('budget.forecast.ofBudget')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Predictive Alerts */}
      {hasWarnings ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('budget.forecast.predictedWarnings')}
          </h3>
          <PredictiveAlert
            predictions={predictions}
            onViewCategory={onViewCategory}
            onAdjustBudget={onAdjustBudget}
            maxAlerts={5}
          />
        </div>
      ) : (
        <Card className="p-6 text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
            {t('budget.forecast.allClear')}
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {t('budget.forecast.allClearDescription')}
          </p>
        </Card>
      )}

      {/* Category Forecasts Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('budget.forecast.categoryForecasts')}
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {tracking.categories.map(cat => {
            const prediction = predictions.find(p => p.category === cat.category)
            const projectedTotal = prediction?.predictedTotal || cat.spent
            const projectedPercent = cat.budgeted > 0 ? (projectedTotal / cat.budgeted) * 100 : 0

            return (
              <div key={cat.category} className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{cat.category}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(cat.spent)} → {formatCurrency(projectedTotal)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-semibold',
                    projectedPercent > 100 ? 'text-red-600' :
                    projectedPercent > 85 ? 'text-amber-600' : 'text-green-600'
                  )}>
                    {Math.round(projectedPercent)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    / {formatCurrency(cat.budgeted)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
