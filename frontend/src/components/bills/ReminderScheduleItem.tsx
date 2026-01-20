import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Bell, Edit2, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ReminderSchedule } from '@/types'
import { format } from 'date-fns'

interface ReminderScheduleItemProps {
  schedule: ReminderSchedule
  onEdit?: () => void
  onDelete?: () => void
}

export function ReminderScheduleItem({
  schedule,
  onEdit,
  onDelete,
}: ReminderScheduleItemProps) {
  const { t } = useTranslation('common')

  const typeLabels: Record<string, string> = {
    days_before: t('bills.reminder.type.daysBefore'),
    specific_date: t('bills.reminder.type.specificDate'),
    recurring: t('bills.reminder.type.recurring'),
  }

  const formatReminderTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr)
      return format(date, 'MMM d, yyyy HH:mm')
    } catch {
      return timeStr
    }
  }

  return (
    <Card className="p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            schedule.is_sent
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-blue-100 dark:bg-blue-900/30'
          )}
        >
          {schedule.is_sent ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {typeLabels[schedule.reminder_type] || schedule.reminder_type}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {schedule.days_before
              ? t('bills.reminder.daysBeforeValue', { count: schedule.days_before })
              : formatReminderTime(schedule.reminder_time)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {schedule.reminder_type === 'recurring' && (
          <div className="mr-2">
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    </Card>
  )
}
