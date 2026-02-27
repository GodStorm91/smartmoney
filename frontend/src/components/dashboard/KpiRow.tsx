import { CountUp } from '@/components/ui/CountUp'
import { cn } from '@/utils/cn'

interface KpiRowProps {
  summary: any
  formatCurrency: (amount: number) => string
  accounts: any[]
  exchangeRates?: Record<string, number>
}

const ASSET_TYPES = ['bank', 'cash', 'investment', 'receivable', 'crypto']

function convertToJpy(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'JPY' || !rates[currency]) return amount
  const rate = rates[currency]
  if (rate === 0) return amount
  const actual = currency === 'USD' ? amount / 100 : amount
  return Math.round(actual / rate)
}

export function KpiRow({ summary, formatCurrency, accounts, exchangeRates = {} }: KpiRowProps) {
  const assets = accounts?.filter(a => ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + convertToJpy(a.current_balance, a.currency || 'JPY', exchangeRates), 0) || 0

  const liabilities = accounts?.filter(a => !ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + Math.abs(convertToJpy(a.current_balance, a.currency || 'JPY', exchangeRates)), 0) || 0

  const kpis = [
    { label: 'Assets', value: assets, color: 'text-income-600 dark:text-income-300' },
    { label: 'Liabilities', value: liabilities, color: 'text-expense-600 dark:text-expense-300' },
    { label: 'Transactions', value: summary?.transaction_count || 0, color: 'text-gray-900 dark:text-gray-100', isCount: true },
  ]

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {kpis.map((kpi, idx) => (
        <div
          key={kpi.label}
          className={cn(
            'text-center p-3 rounded-xl border animate-stagger-in',
            idx === 0 && 'bg-income-50/60 dark:bg-income-900/10 border-income-100/60 dark:border-income-900/20',
            idx === 1 && 'bg-expense-50/60 dark:bg-expense-900/10 border-expense-100/60 dark:border-expense-900/20',
            idx === 2 && 'bg-gray-50/80 dark:bg-gray-800/80 border-gray-100 dark:border-gray-700/50',
          )}
          style={{ '--stagger-index': idx } as React.CSSProperties}
        >
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-300 mb-1.5 uppercase tracking-[0.12em]">{kpi.label}</p>
          <p className={cn('text-lg font-extrabold font-numbers tracking-tight', kpi.color)}>
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
