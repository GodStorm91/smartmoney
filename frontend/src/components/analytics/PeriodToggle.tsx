import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

export type PeriodType = 'current-month' | '3-months' | '6-months' | '1-year'

interface PeriodToggleProps {
  selected: PeriodType
  onChange: (period: PeriodType) => void
  className?: string
}

const PERIODS: { value: PeriodType; labelKey: string }[] = [
  { value: 'current-month', labelKey: 'analytics.currentMonth' },
  { value: '3-months', labelKey: 'analytics.3months' },
  { value: '6-months', labelKey: 'analytics.6months' },
  { value: '1-year', labelKey: 'analytics.1year' },
]

export function PeriodToggle({ selected, onChange, className }: PeriodToggleProps) {
  const { t } = useTranslation('common')

  return (
    <div
      className={cn(
        'inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1',
        className
      )}
    >
      {PERIODS.map(({ value, labelKey }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            'px-3 py-1.5 text-sm font-semibold rounded-md transition-colors',
            value === selected
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  )
}
