import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

interface SavingsRateCardProps {
  rate: number
}

export function SavingsRateCard({ rate }: SavingsRateCardProps) {
  const { t } = useTranslation('common')

  const getStatus = () => {
    if (rate >= 20) return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: t('dashboard.savingsGood', 'Healthy') }
    if (rate >= 10) return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', label: t('dashboard.savingsFair', 'Fair') }
    return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: t('dashboard.savingsLow', 'Low') }
  }

  const status = getStatus()

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('dashboard.savingsRate', 'Savings Rate')}
        </span>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', status.bg, status.color)}>
          {status.label}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-numbers text-gray-900 dark:text-gray-100">
          {Math.round(rate)}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {t('dashboard.ofIncome', 'of income')}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-3 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full animate-progress-fill',
            rate >= 20 ? 'bg-green-500' : rate >= 10 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>
    </Card>
  )
}
