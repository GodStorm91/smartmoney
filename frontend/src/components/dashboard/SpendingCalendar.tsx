import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingDown, DollarSign } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, getDate } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { fetchTransactions } from '@/services/transaction-service'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { formatMonth as formatMonthLabel, getDateLocale } from '@/utils/formatDate'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { cn } from '@/utils/cn'

const weekDaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface SpendingCalendarProps {
  className?: string
  onDayClick?: (date: Date, transactions: any[]) => void
}

interface DailySpending {
  date: Date
  totalSpending: number
  transactionCount: number
  transactions: any[]
}

const SPENDING_LEVELS = [
  { threshold: 0, color: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-100 dark:border-gray-700', text: 'text-gray-400' },
  { threshold: 1000, color: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-600 dark:text-green-400' },
  { threshold: 5000, color: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-600 dark:text-yellow-400' },
  { threshold: 10000, color: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-600 dark:text-orange-400' },
  { threshold: 20000, color: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-600 dark:text-red-400' },
  { threshold: 50000, color: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-300' },
]

function getSpendingLevel(amount: number) {
  if (amount === 0) return SPENDING_LEVELS[0]
  if (amount < 1000) return SPENDING_LEVELS[1]
  if (amount < 5000) return SPENDING_LEVELS[2]
  if (amount < 10000) return SPENDING_LEVELS[3]
  if (amount < 20000) return SPENDING_LEVELS[4]
  return SPENDING_LEVELS[5]
}

export default function SpendingCalendar({ className, onDayClick }: SpendingCalendarProps) {
  const { t, i18n } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null)

  const locale = getDateLocale()
  const weekDays = weekDaysShort.map(day => {
    const date = new Date()
    date.setDate(weekDaysShort.indexOf(day) + 1)
    return format(date, 'EEE', { locale })
  })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions-calendar', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const txs = await fetchTransactions()
      return txs
    },
  })

  const dailySpendingMap = useMemo(() => {
    if (!transactions) return new Map<string, DailySpending>()

    const spendingMap = new Map<string, DailySpending>()

    transactions.forEach((tx: any) => {
      if (tx.type === 'income') return
      if (tx.is_transfer) return
      if (tx.is_adjustment) return // Exclude balance adjustments (not counting towards budget)
      // Exclude all proxy-related transactions
      if (tx.category === 'Proxy Purchase') return
      if (tx.category === 'Proxy Income') return
      if (tx.transfer_type?.startsWith('proxy_')) return

      const dateKey = format(new Date(tx.date), 'yyyy-MM-dd')
      const existing = spendingMap.get(dateKey) || {
        date: new Date(tx.date),
        totalSpending: 0,
        transactionCount: 0,
        transactions: [],
      }

      // Convert transaction amount to JPY using exchange rates
      // Rate is VND per JPY (e.g., 165.74 means 1 JPY = 165.74 VND)
      // So we need to DIVIDE to convert from VND to JPY
      const txCurrency = tx.currency || 'JPY'
      const rateToJpy = rates[txCurrency] || 1
      // For VND: rate = VND per JPY, so divide to get JPY amount
      // For USD: rate = USD per JPY, so divide to get JPY amount
      // For JPY: rate = 1, so dividing by 1 keeps it the same
      const amountJpy = tx.amount / rateToJpy

      existing.totalSpending += Math.abs(amountJpy)
      existing.transactionCount += 1
      existing.transactions.push(tx)

      spendingMap.set(dateKey, existing)
    })

    return spendingMap
  }, [transactions, rates])

  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [calendarStart, calendarEnd])

  const formatCurrency = (amount: number) => {
    return formatCurrencyPrivacy(amount, currency, rates, false, isPrivacyMode)
  }

  const monthlyTotal = useMemo(() => {
    let total = 0
    dailySpendingMap.forEach((data: DailySpending) => {
      if (isSameMonth(data.date, currentMonth)) {
        total += data.totalSpending
      }
    })
    return total
  }, [dailySpendingMap, currentMonth])

  const monthlyAverage = useMemo(() => {
    const daysInMonth = getDate(monthEnd)
    return daysInMonth > 0 ? monthlyTotal / daysInMonth : 0
  }, [monthlyTotal, monthEnd])

  const highestSpendingDay = useMemo(() => {
    let max = 0
    let day: DailySpending | null = null
    dailySpendingMap.forEach((data: DailySpending) => {
      if (isSameMonth(data.date, currentMonth) && data.totalSpending > max) {
        max = data.totalSpending
        day = data
      }
    })
    return day
  }, [dailySpendingMap, currentMonth])

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t('spendingCalendar.title', 'Spending Calendar')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[100px] text-center">
            {formatMonthLabel(currentMonth)}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-expense-50 dark:bg-expense-900/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-expense-600 dark:text-expense-300" />
            <span className="text-xs text-expense-600 dark:text-expense-300">
              {t('spendingCalendar.monthlyTotal', 'Monthly')}
            </span>
          </div>
          <p className="text-sm font-bold text-expense-600 dark:text-expense-300 font-numbers">
            {formatCurrency(monthlyTotal)}
          </p>
        </div>
        <div className="bg-net-50 dark:bg-net-900/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-net-600 dark:text-net-300" />
            <span className="text-xs text-net-600 dark:text-net-300">
              {t('spendingCalendar.dailyAvg', 'Daily Avg')}
            </span>
          </div>
          <p className="text-sm font-bold text-net-600 dark:text-net-300 font-numbers">
            {formatCurrency(monthlyAverage)}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarIcon className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs text-purple-600 dark:text-purple-400">
              {t('spendingCalendar.highestDay', 'Highest')}
            </span>
          </div>
          <p className="text-sm font-bold text-purple-700 dark:text-purple-300 font-numbers">
            {highestSpendingDay ? formatCurrency((highestSpendingDay as DailySpending).totalSpending) : '-'}
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <>
          {/* Week Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const spendingData = dailySpendingMap.get(dateKey) as DailySpending | undefined
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)
              const level = getSpendingLevel(spendingData?.totalSpending || 0)

              return (
                <div
                  key={dateKey}
                  className={cn(
                    'relative aspect-square p-1 rounded-lg border cursor-pointer transition-all duration-200',
                    level.color,
                    level.border,
                    isCurrentMonth ? 'opacity-100' : 'opacity-40',
                    isCurrentDay && 'ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-gray-800',
                    onDayClick && 'hover:scale-105 hover:shadow-md'
                  )}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => onDayClick?.(day, spendingData?.transactions || [])}
                >
                  <div className={cn(
                    'w-full h-full flex flex-col items-center justify-center',
                    isCurrentDay && 'font-bold'
                  )}>
                    <span className={cn(
                      'text-xs',
                      isCurrentDay ? 'text-primary-600 dark:text-primary-400' : level.text
                    )}>
                      {getDate(day)}
                    </span>
                    {spendingData && spendingData.totalSpending > 0 && (
                      <span className={cn('text-[10px] font-medium mt-0.5', level.text)}>
                        {formatCurrency(spendingData.totalSpending)}
                      </span>
                    )}
                  </div>

                  {/* Hover Tooltip */}
                  {hoveredDay && isSameDay(day, hoveredDay) && spendingData && (
                    <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                      <div className="font-medium mb-1">
                        {format(day, 'PPP', { locale })}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>{t('spendingCalendar.transactionCount', '{{count}} transactions', { count: spendingData.transactionCount })}</span>
                        <span className="font-bold text-red-300">
                          -{formatCurrency(spendingData.totalSpending)}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500">{t('spendingCalendar.legend', 'Less')}</span>
            {SPENDING_LEVELS.slice(0, 5).map((level, idx) => (
              <div
                key={idx}
                className={cn(
                  'w-4 h-4 rounded',
                  level.color,
                  'border',
                  idx === 4 && 'ring-1 ring-gray-400'
                )}
              />
            ))}
            <span className="text-xs text-gray-500">{t('spendingCalendar.legendMore', 'More')}</span>
          </div>
        </>
      )}
    </Card>
  )
}
