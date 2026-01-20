import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { billService } from '@/services/bill-service'
import type { ReminderSchedule, ReminderScheduleCreate } from '@/types'

interface ReminderScheduleFormProps {
  isOpen: boolean
  onClose: () => void
  billId: number
  schedule?: ReminderSchedule | null
}

export function ReminderScheduleForm({
  isOpen,
  onClose,
  billId,
  schedule,
}: ReminderScheduleFormProps) {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const isEditing = !!schedule

  const [formData, setFormData] = useState<ReminderScheduleCreate>({
    reminder_type: 'days_before',
    days_before: 3,
    reminder_time: '09:00',
  })

  // Reset form when modal opens/closes or schedule changes
  useEffect(() => {
    if (schedule) {
      setFormData({
        reminder_type: schedule.reminder_type,
        days_before: schedule.days_before || 3,
        reminder_time: extractTimeFromDateTime(schedule.reminder_time),
      })
    } else {
      setFormData({
        reminder_type: 'days_before',
        days_before: 3,
        reminder_time: '09:00',
      })
    }
  }, [schedule, isOpen])

  const extractTimeFromDateTime = (dateTimeStr: string): string => {
    try {
      const date = new Date(dateTimeStr)
      return date.toTimeString().slice(0, 5)
    } catch {
      return '09:00'
    }
  }

  const mutation = useMutation({
    mutationFn: (data: ReminderScheduleCreate) =>
      billService.createReminderSchedule(billId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-schedules', billId] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const typeOptions = [
    { value: 'days_before', label: t('bills.reminder.type.daysBefore') },
    { value: 'specific_date', label: t('bills.reminder.type.specificDate') },
    { value: 'recurring', label: t('bills.reminder.type.recurring') },
  ]

  const daysOptions = [
    { value: '1', label: t('bills.reminder.one_day') },
    { value: '2', label: t('bills.reminder.two_days') },
    { value: '3', label: t('bills.reminder.three_days') },
    { value: '5', label: t('bills.reminder.five_days') },
    { value: '7', label: t('bills.reminder.one_week') },
    { value: '14', label: t('bills.reminder.two_weeks') },
  ]

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('bills.reminder.editSchedule') : t('bills.reminder.addSchedule')}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label={t('bills.reminder.scheduleType')}
          options={typeOptions}
          value={formData.reminder_type}
          onChange={(e) =>
            setFormData({ ...formData, reminder_type: e.target.value as ReminderScheduleCreate['reminder_type'] })
          }
        />

        {formData.reminder_type === 'days_before' && (
          <Select
            label={t('bills.reminder.daysBefore')}
            options={daysOptions}
            value={String(formData.days_before || 3)}
            onChange={(e) =>
              setFormData({ ...formData, days_before: parseInt(e.target.value) })
            }
          />
        )}

        <Input
          label={t('bills.reminder.time')}
          type="time"
          value={formData.reminder_time || '09:00'}
          onChange={(e) =>
            setFormData({ ...formData, reminder_time: e.target.value })
          }
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('button.cancel')}
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? t('button.update') : t('button.save')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
