import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Calendar, Repeat, Bell, Edit, Trash2, CheckCircle, Clock, Settings2, ChevronDown, ChevronUp } from 'lucide-react'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import type { Bill } from '@/types'
import { cn } from '@/utils/cn'
import { BillReminderSettings } from './BillReminderSettings'
import { PartialPaymentDisplay } from './PartialPaymentDisplay'

interface BillDetailModalProps {
  isOpen: boolean
  onClose: () => void
  bill: Bill | null
  onEdit?: (bill: Bill) => void
  onDelete?: (bill: Bill) => void
  onMarkPaid?: (bill: Bill) => void
}

export function BillDetailModal({
  isOpen,
  onClose,
  bill,
  onEdit,
  onDelete,
  onMarkPaid
}: BillDetailModalProps) {
  const { t } = useTranslation('common')
  const [showReminderSettings, setShowReminderSettings] = useState(false)

  if (!bill) return null

  const dueDate = new Date(bill.next_due_date)
  const daysUntilDue = differenceInDays(dueDate, new Date())

  const getStatusInfo = () => {
    if (bill.is_paid) {
      return { status: 'paid', label: t('bills.status.paid'), color: 'green', icon: CheckCircle }
    }
    if (isToday(dueDate)) {
      return { status: 'today', label: t('bills.status.due_today'), color: 'orange', icon: Clock }
    }
    if (isPast(dueDate)) {
      return { status: 'overdue', label: t('bills.status.overdue'), color: 'red', icon: Clock }
    }
    return { status: 'upcoming', label: t('bills.status.upcoming'), color: 'blue', icon: Calendar }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  const recurrenceLabels: Record<string, string> = {
    weekly: t('bills.recurrence.weekly'),
    biweekly: t('bills.recurrence.biweekly'),
    monthly: t('bills.recurrence.monthly'),
    quarterly: t('bills.recurrence.quarterly'),
    yearly: t('bills.recurrence.yearly'),
    custom: t('bills.recurrence.custom'),
    none: t('bills.recurrence.none')
  }

  const handleDelete = () => {
    if (confirm(t('bills.delete_confirm', { name: bill.name }))) {
      onDelete?.(bill)
      onClose()
    }
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('bills.detail.title')}
      size="md"
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {bill.name}
            </h3>
            {bill.category && (
              <Badge variant="default" className="mt-1">
                {bill.category}
              </Badge>
            )}
          </div>
          <Badge
            variant={
              statusInfo.color === 'green' ? 'success' :
              statusInfo.color === 'red' ? 'error' :
              statusInfo.color === 'orange' ? 'warning' : 'default'
            }
          >
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>

        <div className="flex items-center justify-center py-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="text-center">
            <p className={cn(
              'text-4xl font-bold',
              bill.is_paid ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
            )}>
              ${Number(bill.amount).toFixed(2)}
            </p>
            {!bill.is_paid && daysUntilDue >= 0 && (
              <p className={cn(
                'mt-2 text-sm',
                daysUntilDue === 0 ? 'text-orange-500 font-medium' : 'text-gray-500 dark:text-gray-400'
              )}>
                {daysUntilDue === 0
                  ? t('bills.due_today')
                  : t('bills.days_until_due', { count: daysUntilDue })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">
              {format(dueDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {bill.reminder_days_before > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {t('bills.reminder_days_notice', { count: bill.reminder_days_before })}
              </span>
            </div>
          )}

          {bill.recurrence_type && bill.recurrence_type !== 'none' && (
            <div className="flex items-center gap-3 text-sm">
              <Repeat className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {recurrenceLabels[bill.recurrence_type] || bill.recurrence_type}
              </span>
            </div>
          )}
        </div>

        {bill.notes && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {bill.notes}
            </p>
          </div>
        )}

        {/* Reminder Settings Toggle */}
        <Card className="p-4">
          <button
            onClick={() => setShowReminderSettings(!showReminderSettings)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {t('bills.tabs.reminders')}
              </span>
            </div>
            {showReminderSettings ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showReminderSettings && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <BillReminderSettings bill={bill} />
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <PartialPaymentDisplay billId={bill.id} />
              </div>
            </div>
          )}
        </Card>

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {!bill.is_paid && onMarkPaid && (
            <Button
              variant="primary"
              onClick={() => {
                onMarkPaid(bill)
                onClose()
              }}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('bills.actions.mark_paid')}
            </Button>
          )}

          {onEdit && (
            <Button
              variant="secondary"
              onClick={() => {
                onEdit(bill)
                onClose()
              }}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('bills.actions.edit')}
            </Button>
          )}

          {onDelete && (
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </ResponsiveModal>
  )
}
