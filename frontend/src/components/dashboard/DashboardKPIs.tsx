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
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <KPICard
        title="収入"
        amount={summary?.income || 0}
        change={summary?.income_change}
        type="income"
        aria-label="今月の収入"
        icon={
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />

      <KPICard
        title="支出"
        amount={summary?.expense || 0}
        change={summary?.expense_change}
        type="expense"
        aria-label="今月の支出"
        icon={
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        }
      />

      <KPICard
        title="差額"
        amount={summary?.net || 0}
        change={summary?.net_change}
        type="net"
        aria-label="今月の差額"
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    </div>
  )
}
