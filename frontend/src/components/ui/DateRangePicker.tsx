import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
}

type PresetKey = 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'allTime'

export function DateRangePicker({ startDate, endDate, onRangeChange }: DateRangePickerProps) {
  const { t } = useTranslation('common')

  const getPresetRange = (preset: PresetKey): { start: string; end: string } => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    switch (preset) {
      case 'thisMonth': {
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      case 'lastMonth': {
        const start = new Date(year, month - 1, 1)
        const end = new Date(year, month, 0)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      case 'last3Months': {
        const start = new Date(year, month - 2, 1)
        const end = new Date(year, month + 1, 0)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      case 'last6Months': {
        const start = new Date(year, month - 5, 1)
        const end = new Date(year, month + 1, 0)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      case 'thisYear': {
        return {
          start: `${year}-01-01`,
          end: `${year}-12-31`,
        }
      }
      case 'allTime': {
        return {
          start: '2020-01-01',
          end: new Date().toISOString().split('T')[0],
        }
      }
    }
  }

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'thisMonth', label: t('dateRange.thisMonth') },
    { key: 'lastMonth', label: t('dateRange.lastMonth') },
    { key: 'last3Months', label: t('dateRange.last3Months') },
    { key: 'last6Months', label: t('dateRange.last6Months') },
    { key: 'thisYear', label: t('dateRange.thisYear') },
    { key: 'allTime', label: t('dateRange.allTime') },
  ]

  const isPresetActive = (preset: PresetKey): boolean => {
    const range = getPresetRange(preset)
    return startDate === range.start && endDate === range.end
  }

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              const range = getPresetRange(key)
              onRangeChange(range.start, range.end)
            }}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
              isPresetActive(key)
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500 hover:text-primary-600'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      <div className="flex gap-3 items-center">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onRangeChange(e.target.value, endDate)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-gray-500">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onRangeChange(startDate, e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  )
}
