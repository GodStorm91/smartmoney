import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Switch } from '@/components/ui/Switch'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Bell, Clock, Plus } from 'lucide-react'
import { billService } from '@/services/bill-service'
import type { Bill, BillUpdate, ReminderSchedule } from '@/types'
import { ReminderScheduleList } from './ReminderScheduleList'

interface BillReminderSettingsProps {
  bill: Bill
  onUpdate?: (bill: Bill) => void
}

export function BillReminderSettings({ bill, onUpdate }: BillReminderSettingsProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  // Mutation for updating reminder settings
  const updateMutation = useMutation({
    mutationFn: (data: Partial<BillUpdate>) => billService.updateBill(bill.id, data),
    onSuccess: (updatedBill) => {
      queryClient.invalidateQueries({ queryKey: ['bill', bill.id] })
      onUpdate?.(updatedBill as Bill)
    },
  })

  const handleToggleEnabled = (enabled: boolean) => {
    updateMutation.mutate({ reminder_enabled: enabled })
  }

  const handleDaysBeforeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateMutation.mutate({ reminder_days_before: parseInt(e.target.value) })
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMutation.mutate({ reminder_time: e.target.value })
  }

  const daysBeforeOptions = [
    { value: '1', label: t('bills.reminder.one_day') },
    { value: '2', label: t('bills.reminder.two_days') },
    { value: '3', label: t('bills.reminder.three_days') },
    { value: '5', label: t('bills.reminder.five_days') },
    { value: '7', label: t('bills.reminder.one_week') },
  ]

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {t('bills.reminder.enable')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('bills.reminder.enableDescription')}
            </p>
          </div>
        </div>
        <Switch
          checked={bill.reminder_enabled}
          onChange={handleToggleEnabled}
          disabled={updateMutation.isPending}
        />
      </div>

      {bill.reminder_enabled && (
        <>
          {/* Days Before */}
          <div>
            <Select
              label={t('bills.reminder.daysBefore')}
              options={daysBeforeOptions}
              value={String(bill.reminder_days_before || 3)}
              onChange={handleDaysBeforeChange}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Reminder Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('bills.reminder.time')}
              </div>
            </label>
            <Input
              type="time"
              value={bill.due_time || '09:00'}
              onChange={handleTimeChange}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Custom Schedules Section */}
          <ReminderScheduleList billId={bill.id} />
        </>
      )}
    </div>
  )
}
