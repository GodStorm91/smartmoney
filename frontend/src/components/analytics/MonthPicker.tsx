import { useTranslation } from 'react-i18next'
import { format, subMonths, addMonths } from 'date-fns'
import { cn } from '@/utils/cn'

interface MonthPickerProps {
  selectedMonth: Date
  onChange: (date: Date) => void
  className?: string
}

export function MonthPicker({ selectedMonth, onChange, className }: MonthPickerProps) {
  const { i18n } = useTranslation()

  // Format month based on locale
  const formatMonth = (date: Date) => {
    const locale = i18n.language
    if (locale === 'ja') {
      return format(date, 'yyyy年M月')
    }
    if (locale === 'vi') {
      return `Tháng ${format(date, 'M/yyyy')}`
    }
    return format(date, 'MMMM yyyy')
  }

  const handlePrev = () => {
    onChange(subMonths(selectedMonth, 1))
  }

  const handleNext = () => {
    const nextMonth = addMonths(selectedMonth, 1)
    // Don't allow selecting future months
    if (nextMonth <= new Date()) {
      onChange(nextMonth)
    }
  }

  const isNextDisabled = addMonths(selectedMonth, 1) > new Date()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={handlePrev}
        className={cn(
          'p-2 rounded-lg text-gray-600 dark:text-gray-400',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'transition-colors'
        )}
        aria-label="Previous month"
      >
        ←
      </button>
      <span className="min-w-[140px] text-center font-medium text-gray-900 dark:text-gray-100">
        {formatMonth(selectedMonth)}
      </span>
      <button
        onClick={handleNext}
        disabled={isNextDisabled}
        className={cn(
          'p-2 rounded-lg text-gray-600 dark:text-gray-400',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'transition-colors',
          isNextDisabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label="Next month"
      >
        →
      </button>
    </div>
  )
}
