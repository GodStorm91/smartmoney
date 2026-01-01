import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { KPICard } from '@/components/financial/KPICard'

interface DashboardKPIsProps {
  summary?: {
    income: number
    expense: number
    net: number
    income_change: number
    expense_change: number
    net_change: number
  }
}

export function DashboardKPIs({ summary }: DashboardKPIsProps) {
  const { t } = useTranslation('common')

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <Link to="/transactions" search={{ type: 'income' }} className="block">
        <KPICard
          title={t('chart.income')}
          amount={summary?.income || 0}
          change={summary?.income_change}
          type="income"
          aria-label={t('kpi.thisMonthIncome')}
          clickable
          icon={
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </Link>

      <Link to="/transactions" search={{ type: 'expense' }} className="block">
        <KPICard
          title={t('chart.expense')}
          amount={summary?.expense || 0}
          change={summary?.expense_change}
          type="expense"
          aria-label={t('kpi.thisMonthExpense')}
          clickable
          icon={
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          }
        />
      </Link>

      <KPICard
        title={t('chart.net')}
        amount={summary?.net || 0}
        change={summary?.net_change}
        type="net"
        aria-label={t('kpi.thisMonthNet')}
        icon={
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    </div>
  )
}
