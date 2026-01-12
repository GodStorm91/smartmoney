import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { TrendLineChartLazy, ZoomableChartLazy } from '@/components/charts/LazyCharts'
import type { MonthlyData } from '@/types'
import { cn } from '@/utils/cn'

interface TrendChartCardProps {
  data?: MonthlyData[]
  className?: string
}

export function TrendChartCard({ data, className }: TrendChartCardProps) {
  const { t } = useTranslation('common')
  const [selectedMetric, setSelectedMetric] = useState<'net' | 'income' | 'expense'>('net')

  return (
    <Card className={cn('', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('chart.trend12months')}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMetric('net')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedMetric === 'net'
                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('chart.net')}
          </button>
          <button
            onClick={() => setSelectedMetric('income')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedMetric === 'income'
                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('chart.income')}
          </button>
          <button
            onClick={() => setSelectedMetric('expense')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedMetric === 'expense'
                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('chart.expense')}
          </button>
        </div>
      </div>

      <div className="h-80" role="img" aria-label={t('chart.trendChart')}>
        {data && data.length > 0 ? (
          <ZoomableChartLazy className="h-full">
            <TrendLineChartLazy data={data} dataKey={selectedMetric} />
          </ZoomableChartLazy>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            {t('common.noData')}
          </div>
        )}
      </div>
    </Card>
  )
}
