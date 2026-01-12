import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { TrendLineChartLazy, ZoomableChartLazy } from '@/components/charts/LazyCharts'
import type { MonthlyData } from '@/types'
import { cn } from '@/utils/cn'
import { TrendingUp, Minus } from 'lucide-react'

interface TrendChartCardProps {
  data?: MonthlyData[]
  className?: string
}

export function TrendChartCard({ data, className }: TrendChartCardProps) {
  const { t } = useTranslation('common')
  const [selectedMetric, setSelectedMetric] = useState<'net' | 'income' | 'expense'>('net')

  const metricConfig = {
    net: { label: t('chart.net'), color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    income: { label: t('chart.income'), color: '#22C55E', bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    expense: { label: t('chart.expense'), color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  }

  return (
    <Card className={cn('', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('chart.trend12months')}</h3>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
          {(['net', 'income', 'expense'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                selectedMetric === metric
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              {metricConfig[metric].label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80" role="img" aria-label={t('chart.trendChart')}>
        {data && data.length > 0 ? (
          <ZoomableChartLazy className="h-full">
            <TrendLineChartLazy data={data} dataKey={selectedMetric} />
          </ZoomableChartLazy>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 w-fit mx-auto mb-3">
                <Minus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
