import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Receipt, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/formatDate'
import { cn } from '@/utils/cn'
import type { Transaction } from '@/types'

interface RecentTransactionsCardProps {
  transactions: Transaction[] | undefined
  formatCurrency: (amount: number, currency?: string) => string
}

export function RecentTransactionsCard({ transactions, formatCurrency }: RecentTransactionsCardProps) {
  const { t } = useTranslation('common')

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Receipt className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            {t('dashboard.recentTransactions', 'Recent')}
          </h3>
        </div>
        <Link
          to="/transactions"
          className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          {t('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {transactions && transactions.length > 0 ? (
        <div className="space-y-1">
          {transactions.slice(0, 5).map((tx, idx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 animate-stagger-in"
              style={{ '--stagger-index': idx } as React.CSSProperties}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold',
                  tx.type === 'income'
                    ? 'bg-income-100 text-income-600 dark:bg-income-900/20 dark:text-income-300'
                    : 'bg-expense-100 text-expense-600 dark:bg-expense-900/20 dark:text-expense-300'
                )}>
                  {tx.type === 'income' ? '+' : '-'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {tx.description || tx.category}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(tx.date, 'MM/dd')}
                  </p>
                </div>
              </div>
              <span className={cn(
                'text-base font-bold font-numbers tracking-tight',
                tx.type === 'income'
                  ? 'text-income-600 dark:text-income-300'
                  : 'text-gray-900 dark:text-gray-100'
              )}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount), tx.currency || 'JPY')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon={<Receipt />}
          title={t('emptyState.dashboardRecent.title', 'No recent activity')}
          description={t('emptyState.dashboardRecent.description', 'Your latest transactions will appear here')}
          action={
            <Link to="/transactions" className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {t('emptyState.transactions.cta', 'Add Transaction')}
            </Link>
          }
        />
      )}
    </Card>
  )
}
