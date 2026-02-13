import { useTranslation } from 'react-i18next'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import type { RelocationCompareResponse, CityBreakdown } from '@/types/relocation'

interface ComparisonReportProps {
  data: RelocationCompareResponse
}

const COST_KEYS: (keyof Pick<
  CityBreakdown,
  'rent' | 'estimated_food' | 'estimated_utilities' | 'estimated_transport' | 'social_insurance' | 'resident_tax' | 'income_tax'
>)[] = [
  'rent',
  'estimated_food',
  'estimated_utilities',
  'estimated_transport',
  'social_insurance',
  'resident_tax',
  'income_tax',
]

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

function CityColumn({ breakdown, label }: { breakdown: CityBreakdown; label: string }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
        {label}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate">
        {breakdown.prefecture_name}
      </p>
      <div className="space-y-2">
        {COST_KEYS.map((key) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400 truncate mr-2">
              {t(`relocation.cost.${key}`)}
            </span>
            <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {formatYen(breakdown[key])}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-gray-900 dark:text-white">{t('relocation.totalMonthly')}</span>
          <span className="text-gray-900 dark:text-white">{formatYen(breakdown.total_monthly)}</span>
        </div>
      </div>
    </div>
  )
}

export function ComparisonReport({ data }: ComparisonReportProps) {
  const { t } = useTranslation('common')
  const diff = data.monthly_difference
  const isSaving = diff < 0
  const isMore = diff > 0

  return (
    <div className="space-y-4">
      <Card variant="gradient">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('relocation.monthlyDiff')}</p>
            <p className={cn(
              'text-2xl font-bold',
              isSaving ? 'text-emerald-600 dark:text-emerald-400' : isMore ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
            )}>
              {isSaving ? '' : isMore ? '+' : ''}{formatYen(diff)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('relocation.annualDiff')}: {isSaving ? '' : isMore ? '+' : ''}{formatYen(data.annual_difference)}
            </p>
          </div>
          <Badge variant={isSaving ? 'success' : isMore ? 'error' : 'default'}>
            <span className="flex items-center gap-1">
              {isSaving ? <TrendingDown className="w-3 h-3" /> : isMore ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {isSaving ? t('relocation.saving') : isMore ? t('relocation.moreExpensive') : t('relocation.same')}
            </span>
          </Badge>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('relocation.breakdown')}
        </h2>
        <div className="flex gap-4 sm:gap-6">
          <CityColumn breakdown={data.current} label={data.current.city_name} />
          <div className="w-px bg-gray-200 dark:bg-gray-700 shrink-0" />
          <CityColumn breakdown={data.target} label={data.target.city_name} />
        </div>
      </Card>
    </div>
  )
}
