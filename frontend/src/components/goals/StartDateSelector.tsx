import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { getLocaleTag } from '@/utils/formatDate'
import type { StartDateOption } from './goal-form-helpers'

interface StartDateSelectorProps {
  selectedOption: StartDateOption
  customDate: string
  customDateError?: string
  onOptionChange: (option: StartDateOption) => void
  onCustomDateChange: (date: string) => void
}

export function StartDateSelector({
  selectedOption,
  customDate,
  customDateError,
  onOptionChange,
  onCustomDateChange,
}: StartDateSelectorProps) {
  const { t } = useTranslation()

  const nextMonthDate = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1
  )

  const dateLocale = getLocaleTag()

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t('goals.form.startDate')}
      </label>
      <div className="space-y-3">
        {/* Today option */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="startDate"
            value="today"
            checked={selectedOption === 'today'}
            onChange={() => onOptionChange('today')}
            className="mt-1 w-4 h-4 text-primary-500 focus:ring-primary-500"
            aria-label={t('goals.form.startDateTodayAria')}
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('goals.form.startDateToday')}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {new Date().toLocaleDateString(dateLocale)}
            </div>
          </div>
        </label>

        {/* Next month start option */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="startDate"
            value="month_start"
            checked={selectedOption === 'month_start'}
            onChange={() => onOptionChange('month_start')}
            className="mt-1 w-4 h-4 text-primary-500 focus:ring-primary-500"
            aria-label={t('goals.form.startDateNextMonthAria')}
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('goals.form.startDateNextMonth')}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {nextMonthDate.toLocaleDateString(dateLocale)}
            </div>
          </div>
        </label>

        {/* Custom date option */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="startDate"
            value="custom"
            checked={selectedOption === 'custom'}
            onChange={() => onOptionChange('custom')}
            className="mt-1 w-4 h-4 text-primary-500 focus:ring-primary-500"
            aria-label={t('goals.form.startDateCustomAria')}
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('goals.form.startDateCustom')}</div>
            {selectedOption === 'custom' && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => onCustomDateChange(e.target.value)}
                error={customDateError}
                className="text-sm"
                aria-label={t('goals.form.startDateCustomAria')}
              />
            )}
          </div>
        </label>
      </div>
    </div>
  )
}
