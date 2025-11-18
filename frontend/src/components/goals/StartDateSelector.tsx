import { Input } from '@/components/ui/Input'
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
  const nextMonthDate = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1
  )

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        開始日
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
            aria-label="今日から開始"
          />
          <div>
            <div className="text-sm font-medium text-gray-900">今日</div>
            <div className="text-xs text-gray-600">
              {new Date().toLocaleDateString('ja-JP')}
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
            aria-label="来月1日から開始"
          />
          <div>
            <div className="text-sm font-medium text-gray-900">来月1日</div>
            <div className="text-xs text-gray-600">
              {nextMonthDate.toLocaleDateString('ja-JP')}
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
            aria-label="カスタム日付を選択"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 mb-2">カスタム</div>
            {selectedOption === 'custom' && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => onCustomDateChange(e.target.value)}
                error={customDateError}
                className="text-sm"
                aria-label="カスタム開始日を選択"
              />
            )}
          </div>
        </label>
      </div>
    </div>
  )
}
