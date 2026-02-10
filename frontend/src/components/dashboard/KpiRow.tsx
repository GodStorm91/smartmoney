import { CountUp } from '@/components/ui/CountUp'
import { cn } from '@/utils/cn'

interface KpiRowProps {
  summary: any
  formatCurrency: (amount: number) => string
  accounts: any[]
}

const ASSET_TYPES = ['bank', 'cash', 'investment', 'receivable', 'crypto']

export function KpiRow({ summary, formatCurrency, accounts }: KpiRowProps) {
  const assets = accounts?.filter(a => ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + a.current_balance, 0) || 0

  const liabilities = accounts?.filter(a => !ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + Math.abs(a.current_balance), 0) || 0

  const kpis = [
    { label: 'Assets', value: assets, color: 'text-green-600 dark:text-green-400' },
    { label: 'Liabilities', value: liabilities, color: 'text-red-600 dark:text-red-400' },
    { label: 'Transactions', value: summary?.transaction_count || 0, color: 'text-gray-900 dark:text-gray-100', isCount: true },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map((kpi, idx) => (
        <div
          key={kpi.label}
          className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg animate-stagger-in"
          style={{ '--stagger-index': idx } as React.CSSProperties}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{kpi.label}</p>
          <p className={cn('text-sm font-semibold font-numbers', kpi.color)}>
            {kpi.isCount ? (
              <CountUp end={kpi.value} duration={800} />
            ) : (
              <CountUp end={kpi.value} duration={800} formatter={formatCurrency} />
            )}
          </p>
        </div>
      ))}
    </div>
  )
}
