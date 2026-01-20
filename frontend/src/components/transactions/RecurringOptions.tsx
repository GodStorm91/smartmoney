/**
 * RecurringOptions - Frequency selector for recurring transactions
 */
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { FrequencyType } from '@/services/recurring-service'

interface RecurringOptionsProps {
  frequency: FrequencyType
  setFrequency: (f: FrequencyType) => void
  dayOfWeek: number
  setDayOfWeek: (d: number) => void
  dayOfMonth: number
  setDayOfMonth: (d: number) => void
  intervalDays: number
  setIntervalDays: (d: number) => void
}

const DAYS_OF_WEEK = [
  { value: 0, key: 'recurring.days.monday' },
  { value: 1, key: 'recurring.days.tuesday' },
  { value: 2, key: 'recurring.days.wednesday' },
  { value: 3, key: 'recurring.days.thursday' },
  { value: 4, key: 'recurring.days.friday' },
  { value: 5, key: 'recurring.days.saturday' },
  { value: 6, key: 'recurring.days.sunday' },
]

export function RecurringOptions({
  frequency,
  setFrequency,
  dayOfWeek,
  setDayOfWeek,
  dayOfMonth,
  setDayOfMonth,
  intervalDays,
  setIntervalDays,
}: RecurringOptionsProps) {
  const { t } = useTranslation('common')

  return (
    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
      {/* Frequency Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('recurring.frequency')}
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as FrequencyType)}
          className={cn(
            'w-full h-10 px-3 border rounded-lg text-sm',
            'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
            'border-gray-300'
          )}
        >
          <option value="weekly">{t('recurring.weekly')}</option>
          <option value="monthly">{t('recurring.monthly')}</option>
          <option value="yearly">{t('recurring.yearly')}</option>
          <option value="custom">{t('recurring.custom')}</option>
        </select>
      </div>

      {/* Weekly: Day of Week */}
      {frequency === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('recurring.dayOfWeek')}
          </label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
            className={cn(
              'w-full h-10 px-3 border rounded-lg text-sm',
              'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
              'border-gray-300'
            )}
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day.value} value={day.value}>
                {t(day.key)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Monthly: Day of Month */}
      {frequency === 'monthly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('recurring.dayOfMonth')}
          </label>
          <select
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
            className={cn(
              'w-full h-10 px-3 border rounded-lg text-sm',
              'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
              'border-gray-300'
            )}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Custom: Every N Days */}
      {frequency === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('recurring.everyNDays', { n: intervalDays })}
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 7)))}
            className={cn(
              'w-full h-10 px-3 border rounded-lg text-sm',
              'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
              'border-gray-300'
            )}
          />
        </div>
      )}
    </div>
  )
}
