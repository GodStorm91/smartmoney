import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import type { MonthlyData } from '@/types'

interface TrendChartCardProps {
  data?: MonthlyData[]
}

export function TrendChartCard({ data }: TrendChartCardProps) {
  const { t } = useTranslation('common')
  const [selectedMetric, setSelectedMetric] = useState<'net' | 'income' | 'expense'>('net')

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('chart.trend12months')}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMetric('net')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedMetric === 'net'
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('chart.net')}
          </button>
          <button
            onClick={() => setSelectedMetric('income')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedMetric === 'income'
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('chart.income')}
          </button>
          <button
            onClick={() => setSelectedMetric('expense')}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedMetric === 'expense'
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('chart.expense')}
          </button>
        </div>
      </div>

      <div className="h-80" role="img" aria-label={t('chart.trendChart')}>
        {data && data.length > 0 ? (
          <TrendLineChart data={data} dataKey={selectedMetric} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            {t('common.noData')}
          </div>
        )}
      </div>
    </Card>
  )
}
