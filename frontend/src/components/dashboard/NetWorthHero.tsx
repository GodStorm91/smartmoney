import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'

interface NetWorthHeroProps {
  summary: any
}

export function NetWorthHero({ summary }: NetWorthHeroProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { data: exchangeRates } = useExchangeRates()
  const { isPrivacyMode } = usePrivacy()
  const [expanded, setExpanded] = useState(false)

  const netWorth = summary?.net || 0
  const monthlyNet = summary?.net_change || 0

  const formatCurrency = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, exchangeRates?.rates || {}, false, isPrivacyMode)

  return (
    <Card
      variant="gradient"
      className={cn(
        'cursor-pointer transition-all duration-300 bg-hero-gradient overflow-hidden relative',
        expanded ? 'shadow-hero ring-glow' : 'hover:shadow-hero'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Subtle accent stripe at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-net-300 opacity-60" />

      <div className="flex items-center gap-2 mb-1 pt-1">
        <Wallet className="w-4 h-4 text-primary-600 dark:text-primary-300" />
        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-[0.15em]">
          {t('dashboard.netWorth', 'Net Worth')}
        </span>
      </div>

      <p className={cn(
        'text-[2.75rem] sm:text-[3.5rem] font-extrabold font-numbers tracking-[-0.02em] sm:tracking-[-0.03em] leading-tight',
        netWorth >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-expense-600 dark:text-expense-300'
      )}>
        {formatCurrency(netWorth)}
      </p>

      {monthlyNet !== 0 && (
        <div className={cn(
          'inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-bold',
          monthlyNet >= 0
            ? 'bg-income-100/80 text-income-600 dark:bg-income-900/40 dark:text-income-300'
            : 'bg-expense-100/80 text-expense-600 dark:bg-expense-900/40 dark:text-expense-300'
        )}>
          {monthlyNet >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {monthlyNet >= 0 ? '+' : ''}{formatCurrency(monthlyNet)}
          <span className="text-[10px] font-medium opacity-70 ml-0.5">
            {t('dashboard.thisMonth', 'this month')}
          </span>
        </div>
      )}

      {expanded && (
        <div className="mt-5 pt-4 border-t border-gray-200/40 dark:border-gray-700/40">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-0.5">{t('dashboard.assets', 'Assets')}</p>
              <p className="text-lg font-bold font-numbers text-income-600 dark:text-income-300">
                {formatCurrency(summary?.total_income || 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-0.5">{t('dashboard.expenses', 'Expenses')}</p>
              <p className="text-lg font-bold font-numbers text-expense-600 dark:text-expense-300">
                {formatCurrency(summary?.total_expense || 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
