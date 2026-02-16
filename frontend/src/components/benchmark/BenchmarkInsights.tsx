import { useTranslation } from 'react-i18next'
import { Lightbulb, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

interface BenchmarkInsightsProps {
  insights: string
  overCategories: string[]
  underCategories: string[]
}

export function BenchmarkInsights({ insights, overCategories, underCategories }: BenchmarkInsightsProps) {
  const { t } = useTranslation('common')

  return (
    <Card variant="glass" className="border-primary-100 dark:border-primary-900/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-gray-100">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          {t('benchmark.insights', 'Insights')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* AI-generated insights text */}
        <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {insights}
          </p>
        </div>

        {/* Category highlights */}
        {(overCategories.length > 0 || underCategories.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Over budget categories */}
            {overCategories.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                  <TrendingUp className="w-4 h-4" />
                  {t('benchmark.spendingMore', 'Spending more than average')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {overCategories.map((category) => (
                    <span
                      key={category}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-full',
                        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
                        'border border-red-200 dark:border-red-800'
                      )}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Under budget categories */}
            {underCategories.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <TrendingDown className="w-4 h-4" />
                  {t('benchmark.spendingLess', 'Spending less than average')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {underCategories.map((category) => (
                    <span
                      key={category}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-full',
                        'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                        'border border-green-200 dark:border-green-800'
                      )}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {overCategories.length === 0 && underCategories.length === 0 && !insights && (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
            {t('benchmark.noInsights', 'No insights available yet. Add more transactions to generate insights.')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
