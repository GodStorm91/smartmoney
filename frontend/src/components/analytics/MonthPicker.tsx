import { subMonths, addMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonth } from '@/utils/formatDate'
import { cn } from '@/utils/cn'

interface MonthPickerProps {
  selectedMonth: Date
  onChange: (date: Date) => void
  className?: string
}

export function MonthPicker({ selectedMonth, onChange, className }: MonthPickerProps) {

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
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="min-w-[140px] text-center font-semibold text-gray-900 dark:text-gray-100">
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
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
