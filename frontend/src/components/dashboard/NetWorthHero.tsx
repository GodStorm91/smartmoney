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
        'cursor-pointer transition-all duration-300',
        expanded && 'shadow-lg'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
          <Wallet className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('dashboard.netWorth', 'Net Worth')}
        </span>
      </div>

      <p className={cn(
        'text-3xl sm:text-4xl font-bold font-numbers tracking-tight',
        netWorth >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-expense-600 dark:text-expense-300'
      )}>
        {formatCurrency(netWorth)}
      </p>

      {monthlyNet !== 0 && (
        <div className={cn(
          'inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium',
          monthlyNet >= 0
            ? 'bg-income-100 text-income-600 dark:bg-income-900/30 dark:text-income-300'
            : 'bg-expense-100 text-expense-600 dark:bg-expense-900/30 dark:text-expense-300'
        )}>
          {monthlyNet >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {monthlyNet >= 0 ? '+' : ''}{formatCurrency(monthlyNet)}
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{t('dashboard.assets', 'Assets')}</p>
              <p className="font-semibold text-income-600 dark:text-income-300">
                {formatCurrency(summary?.total_income || 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{t('dashboard.expenses', 'Expenses')}</p>
              <p className="font-semibold text-expense-600 dark:text-expense-300">
                {formatCurrency(summary?.total_expense || 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
