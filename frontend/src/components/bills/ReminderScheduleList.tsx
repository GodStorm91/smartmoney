import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Plus } from 'lucide-react'
import { billService } from '@/services/bill-service'
import type { ReminderSchedule } from '@/types'
import { ReminderScheduleItem } from './ReminderScheduleItem'
import { ReminderScheduleForm } from './ReminderScheduleForm'

interface ReminderScheduleListProps {
  billId: number
}

export function ReminderScheduleList({ billId }: ReminderScheduleListProps) {
  const { t } = useTranslation('common')
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ReminderSchedule | null>(null)
  const queryClient = useQueryClient()

  // Fetch schedules
  const { data, isLoading } = useQuery({
    queryKey: ['reminder-schedules', billId],
    queryFn: () => billService.getReminderSchedules(billId),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (scheduleId: number) => billService.deleteReminderSchedule(billId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-schedules', billId] })
    },
  })

  const handleEdit = (schedule: ReminderSchedule) => {
    setEditingSchedule(schedule)
    setShowForm(true)
  }

  const handleDelete = (scheduleId: number) => {
    if (confirm(t('bills.reminder.deleteConfirm'))) {
      deleteMutation.mutate(scheduleId)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingSchedule(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          {t('bills.reminder.customSchedules')}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          {t('bills.reminder.addSchedule')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      ) : !data?.schedules || data.schedules.length === 0 ? (
        <EmptyState
          title={t('bills.reminder.noSchedules')}
          className="py-6"
        />
      ) : (
        <div className="space-y-2">
          {data.schedules.map((schedule) => (
            <ReminderScheduleItem
              key={schedule.id}
              schedule={schedule}
              onEdit={() => handleEdit(schedule)}
              onDelete={() => handleDelete(schedule.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <ReminderScheduleForm
        isOpen={showForm || !!editingSchedule}
        onClose={handleCloseForm}
        billId={billId}
        schedule={editingSchedule}
      />
    </div>
  )
}
