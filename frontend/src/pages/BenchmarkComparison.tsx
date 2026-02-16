import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BarChart3, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ProfileSummaryCard } from '@/components/benchmark/ProfileSummaryCard'
import { ComparisonChart } from '@/components/benchmark/ComparisonChart'
import { BenchmarkInsights } from '@/components/benchmark/BenchmarkInsights'
import { getBenchmarkComparison, getHouseholdProfile } from '@/services/benchmark-service'
import { formatCurrency } from '@/utils/formatCurrency'
import { useSettings } from '@/contexts/SettingsContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'

export function BenchmarkComparison() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()

  // Fetch household profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['household-profile'],
    queryFn: getHouseholdProfile,
  })

  // Fetch comparison data (only if profile exists)
  const { data: comparison, isLoading: isLoadingComparison, error } = useQuery({
    queryKey: ['benchmark-comparison'],
    queryFn: getBenchmarkComparison,
    enabled: !!profile,
  })

  const isLoading = isLoadingProfile || isLoadingComparison

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary-600 dark:text-primary-400" />
          {t('benchmark.title', 'Spending Benchmark')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('benchmark.subtitle', 'Compare your spending against national averages')}
        </p>
      </div>

      {/* Profile Summary */}
      <div className="mb-6">
        <ProfileSummaryCard profile={profile || null} />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                {t('benchmark.errorTitle', 'Failed to load comparison data')}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                {t('benchmark.errorMessage', 'Please ensure you have transactions recorded and try again.')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* No Profile State */}
      {!isLoading && !profile && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-1">
              {t('benchmark.setupRequired', 'Set up your household profile')}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('benchmark.setupHint', 'Go to Settings to configure your family size, prefecture, and income bracket.')}
            </p>
          </div>
        </Card>
      )}

      {/* Comparison Data */}
      {!isLoading && !error && comparison && (
        <div className="space-y-6">
          {/* Total Spending Summary */}
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('benchmark.yourTotal', 'Your Total (3mo avg)')}
                </p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {formatCurrency(comparison.total_user, currency, exchangeRates?.rates || {}, false)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('benchmark.avgTotal', 'National Average')}
                </p>
                <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                  {formatCurrency(comparison.total_benchmark, currency, exchangeRates?.rates || {}, false)}
                </p>
              </div>
            </div>
          </Card>

          {/* Comparison Chart */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('benchmark.categoryComparison', 'Category Comparison')}
            </h3>
            <ComparisonChart comparison={comparison.comparison} />
          </Card>

          {/* AI Insights */}
          {comparison.insights && (
            <BenchmarkInsights
              insights={comparison.insights}
              overCategories={comparison.comparison.filter(c => c.status === 'over').map(c => c.category)}
              underCategories={comparison.comparison.filter(c => c.status === 'under').map(c => c.category)}
            />
          )}
        </div>
      )}
    </div>
  )
}
