import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useBillCalendar } from '@/hooks/useBills'
import { cn } from '@/utils/cn'
import type { Bill } from '@/types'

interface BillCalendarProps {
  onDayClick?: (day: number, bills: Bill[]) => void
  onBillClick?: (bill: Bill) => void
  className?: string
}

export function BillCalendar({ onDayClick, onBillClick, className }: BillCalendarProps) {
  const { t } = useTranslation('common')
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const { data: calendarData, isLoading } = useBillCalendar(year, month)

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getBillsForDay = (day: number): Bill[] => {
    if (!calendarData?.days) return []
    const dayData = calendarData.days.find(d => d.day === day)
    return dayData?.bills || []
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('bills.calendar.title', 'Bill Calendar')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square p-1" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const bills = getBillsForDay(day)
              const hasBills = bills.length > 0
              const hasUnpaid = bills.some(b => !b.is_paid)

              return (
                <div
                  key={day}
                  className={cn(
                    'aspect-square p-1 rounded-lg border cursor-pointer transition-all',
                    hasUnpaid
                      ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      : hasBills
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-100 dark:border-gray-700',
                    'hover:scale-105'
                  )}
                  onClick={() => onDayClick?.(day, bills)}
                >
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <span className={cn(
                      'text-xs font-medium',
                      hasUnpaid
                        ? 'text-red-600 dark:text-red-400'
                        : hasBills
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {day}
                    </span>
                    {hasBills && (
                      <div className="flex gap-0.5 mt-0.5">
                        {bills.slice(0, 3).map((bill, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              bill.is_paid
                                ? 'bg-green-400'
                                : 'bg-red-500'
                            )}
                          />
                        ))}
                        {bills.length > 3 && (
                          <span className="text-[8px] text-gray-500">+{bills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {calendarData && calendarData.total_bills_due > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('bills.calendar.total_due', 'Total Due')}:
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {calendarData.total_bills_due} bills
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
