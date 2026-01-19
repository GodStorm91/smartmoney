import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import type { Bill, BillCreate } from '@/types'
import { billService } from '@/services/bill-service'

interface BillFormProps {
  isOpen: boolean
  onClose: () => void
  bill?: Bill | null
  onSuccess?: (bill: Bill) => void
}

export function BillForm({ isOpen, onClose, bill, onSuccess }: BillFormProps) {
  const { t } = useTranslation('common')
  const isEditing = !!bill

  const [formData, setFormData] = useState<Partial<BillCreate>>({
    name: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    is_paid: false,
    recurrence_type: 'none',
    recurrence_day: null,
    reminder_days_before: 1,
    category: '',
    notes: '',
    color: '#6366f1'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (bill) {
      setFormData({
        name: bill.name,
        amount: Number(bill.amount),
        due_date: bill.due_date.split('T')[0],
        is_paid: bill.is_paid,
        recurrence_type: bill.recurrence_type || 'none',
        recurrence_day: bill.recurrence_day || null,
        reminder_days_before: bill.reminder_days_before || 1,
        category: bill.category || '',
        notes: bill.notes || '',
        color: bill.color || '#6366f1'
      })
    } else {
      setFormData({
        name: '',
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        is_paid: false,
        recurrence_type: 'none',
        recurrence_day: null,
        reminder_days_before: 1,
        category: '',
        notes: '',
        color: '#6366f1'
      })
    }
    setErrors({})
  }, [bill, isOpen])

  const recurrenceOptions = [
    { value: 'none', label: t('bills.recurrence.none') },
    { value: 'weekly', label: t('bills.recurrence.weekly') },
    { value: 'biweekly', label: t('bills.recurrence.biweekly') },
    { value: 'monthly', label: t('bills.recurrence.monthly') },
    { value: 'quarterly', label: t('bills.recurrence.quarterly') },
    { value: 'yearly', label: t('bills.recurrence.yearly') }
  ]

  const reminderOptions = [
    { value: 0, label: t('bills.reminder.no_reminder') },
    { value: 1, label: t('bills.reminder.one_day') },
    { value: 3, label: t('bills.reminder.three_days') },
    { value: 5, label: t('bills.reminder.five_days') },
    { value: 7, label: t('bills.reminder.one_week') }
  ]

  const categoryOptions = [
    { value: '', label: t('bills.category.select') },
    { value: 'Utilities', label: t('bills.category.utilities') },
    { value: 'Rent/Mortgage', label: t('bills.category.rent_mortgage') },
    { value: 'Insurance', label: t('bills.category.insurance') },
    { value: 'Subscriptions', label: t('bills.category.subscriptions') },
    { value: 'Phone/Internet', label: t('bills.category.phone_internet') },
    { value: 'Loan', label: t('bills.category.loan') },
    { value: 'Credit Card', label: t('bills.category.credit_card') },
    { value: 'Other', label: t('bills.category.other') }
  ]

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = t('bills.validation.name_required')
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('bills.validation.amount_required')
    }

    if (!formData.due_date) {
      newErrors.due_date = t('bills.validation.due_date_required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)
    try {
      let savedBill: Bill
      if (isEditing && bill) {
        savedBill = await billService.updateBill(bill.id, formData as BillCreate)
      } else {
        savedBill = await billService.createBill(formData as BillCreate)
      }
      onSuccess?.(savedBill)
      onClose()
    } catch (error) {
      console.error('Failed to save bill:', error)
      setErrors({ submit: t('bills.validation.submit_failed') })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('bills.edit_bill') : t('bills.add_bill')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bills.field.name')}
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('bills.placeholder.name')}
              error={errors.name}
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bills.field.amount')}
            </label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              error={errors.amount}
            />
          </div>

          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bills.field.due_date')}
            </label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              error={errors.due_date}
            />
          </div>

          <div>
            <label htmlFor="recurrence_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bills.field.recurrence')}
            </label>
            <Select
              id="recurrence_type"
              options={recurrenceOptions}
              value={formData.recurrence_type}
              onChange={(e) => setFormData(prev => ({ ...prev, recurrence_type: e.target.value as BillCreate['recurrence_type'] }))}
            />
          </div>

          <div>
            <label htmlFor="reminder_days_before" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bills.field.reminder')}
            </label>
            <Select
              id="reminder_days_before"
              options={reminderOptions}
              value={formData.reminder_days_before}
              onChange={(e) => setFormData(prev => ({ ...prev, reminder_days_before: parseInt(e.target.value) }))}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bills.field.category')}
            </label>
            <Select
              id="category"
              options={categoryOptions}
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bills.field.color')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="flex-1"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bills.field.notes')}
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t('bills.placeholder.notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_paid}
                onChange={(e) => setFormData(prev => ({ ...prev, is_paid: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('bills.field.already_paid')}
              </span>
            </label>
          </div>
        </div>

        {errors.submit && (
          <p className="text-sm text-red-500">{errors.submit}</p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
