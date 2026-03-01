import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CreditCard, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { RecurringTransaction, FrequencyType } from '@/services/recurring-service'

interface SubscriptionsWidgetProps {
  recurringTxns: RecurringTransaction[] | undefined
  formatCurrency: (amount: number) => string
}

function toMonthly(amount: number, freq: FrequencyType): number {
  switch (freq) {
    case 'daily': return amount * 30
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'yearly': return amount / 12
    default: return amount
  }
}

export function SubscriptionsWidget({ recurringTxns, formatCurrency }: SubscriptionsWidgetProps) {
  const { t } = useTranslation('common')

  const subs = (recurringTxns || []).filter(
    (r) => !r.is_income && !r.is_transfer
  )
  if (subs.length === 0) return null

  const monthlyTotal = subs.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('subscriptions.title', 'Subscriptions')}: {formatCurrency(monthlyTotal)}/{t('subscriptions.mo', 'mo')}
          </h3>
        </div>
        <Link
          to="/recurring"
          search={{ tab: 'subscriptions' }}
          className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          {t('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="space-y-1">
        {subs.slice(0, 3).map((sub) => (
          <div key={sub.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {sub.description}
            </p>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-numbers shrink-0 ml-3">
              {formatCurrency(toMonthly(sub.amount, sub.frequency))}/{t('subscriptions.mo', 'mo')}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
