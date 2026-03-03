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

const selectClass = cn(
  'w-full h-12 px-4 border rounded-lg text-sm',
  'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
  'border-gray-300',
  'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
)

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
    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-4 border border-gray-200 dark:border-gray-700">
      {/* Frequency Selector */}
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
          {t('recurring.frequency')}
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as FrequencyType)}
          className={selectClass}
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
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            {t('recurring.dayOfWeek')}
          </label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
            className={selectClass}
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
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            {t('recurring.dayOfMonth')}
          </label>
          <select
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
            className={selectClass}
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
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            {t('recurring.everyNDays', { n: intervalDays })}
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 7)))}
            className={cn(selectClass, 'font-numbers')}
          />
        </div>
      )}
    </div>
  )
}
