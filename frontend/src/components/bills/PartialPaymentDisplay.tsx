import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Progress } from '@/components/ui/Progress'
import { Bell, AlertCircle } from 'lucide-react'
import { billService } from '@/services/bill-service'
import type { PartialPaymentStatusResponse } from '@/types'
import { cn } from '@/utils/cn'

interface PartialPaymentDisplayProps {
  billId: number
}

export function PartialPaymentDisplay({ billId }: PartialPaymentDisplayProps) {
  const { t } = useTranslation('common')
  const [showAlertForm, setShowAlertForm] = useState(false)

  // Fetch partial payment status
  const { data, isLoading } = useQuery({
    queryKey: ['partial-payment', billId],
    queryFn: () => billService.getPartialPaymentStatus(billId),
  })

  // Trigger alert mutation
  const alertMutation = useMutation({
    mutationFn: () => billService.triggerPartialPaymentAlert(billId),
    onSuccess: (response) => {
      if (response.alert_sent) {
        setShowAlertForm(false)
        // Could show a toast notification here
      }
    },
  })

  if (isLoading) return null
  if (!data?.has_partial_payment) return null

  const percentage = data.total_amount > 0
    ? (data.paid_amount / data.total_amount) * 100
    : 0

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            {t('bills.partialPayment.title')}
          </h4>
          {data.is_fully_paid ? (
            <Badge variant="success">{t('bills.partialPayment.paid')}</Badge>
          ) : (
            <Badge variant="warning">{t('bills.partialPayment.inProgress')}</Badge>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {t('bills.partialPayment.paid')}
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatCurrency(data.paid_amount)}
            </span>
          </div>
          <Progress value={percentage} className="h-3" />
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {t('bills.partialPayment.remaining')}
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatCurrency(data.remaining_amount)}
            </span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('bills.partialPayment.total')}
          </span>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(data.total_amount)}
          </span>
        </div>

        {/* Trigger Alert Button */}
        {!data.is_fully_paid && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAlertForm(true)}
          >
            <Bell className="w-4 h-4 mr-2" />
            {t('bills.partialPayment.triggerAlert')}
          </Button>
        )}
      </Card>

      {/* Alert Confirmation Modal */}
      <ResponsiveModal
        isOpen={showAlertForm}
        onClose={() => setShowAlertForm(false)}
        title={t('bills.partialPayment.alertTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t('bills.partialPayment.alertInfo')}
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t('bills.partialPayment.alertDescription', {
                  amount: formatCurrency(data.remaining_amount),
                })}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowAlertForm(false)}
            >
              {t('button.cancel')}
            </Button>
            <Button
              variant="primary"
              loading={alertMutation.isPending}
              onClick={() => alertMutation.mutate()}
            >
              {t('bills.partialPayment.sendAlert')}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </>
  )
}
