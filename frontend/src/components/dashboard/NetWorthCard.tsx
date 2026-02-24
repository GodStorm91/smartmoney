import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CountUp } from '@/components/ui/CountUp'
import { useAccounts } from '@/hooks/useAccounts'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import { fetchWallets, fetchWallet, fetchDefiPositions } from '@/services/crypto-service'

const ASSET_TYPES = ['bank', 'cash', 'investment', 'receivable', 'crypto']

interface NetWorthCardProps {
  monthlyNet?: number
  monthlyNetChange?: number | null
}

export function NetWorthCard({ monthlyNet, monthlyNetChange }: NetWorthCardProps) {
  const { t } = useTranslation('common')
  const { data: accounts } = useAccounts()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()
  const [showBreakdown, setShowBreakdown] = useState(false)

  // Fetch crypto wallets
  const { data: wallets } = useQuery({
    queryKey: ['crypto-wallets'],
    queryFn: fetchWallets,
  })

  // Fetch balance for each wallet (token holdings)
  const { data: walletsWithBalance } = useQuery({
    queryKey: ['crypto-wallets-balance', wallets?.map(w => w.id)],
    queryFn: async () => {
      if (!wallets || wallets.length === 0) return []
      return Promise.all(wallets.map(w => fetchWallet(w.id)))
    },
    enabled: !!wallets && wallets.length > 0,
  })

  // Fetch DeFi positions for each wallet (LP positions, staking, etc.)
  const { data: defiPositions } = useQuery({
    queryKey: ['crypto-defi-positions', wallets?.map(w => w.id)],
    queryFn: async () => {
      if (!wallets || wallets.length === 0) return []
      return Promise.all(
        wallets.map(w =>
          fetchDefiPositions(w.id).catch(() => ({
            wallet_address: '',
            total_value_usd: 0,
            positions: [],
          }))
        )
      )
    },
    enabled: !!wallets && wallets.length > 0,
  })

  // Calculate crypto balance: wallet tokens + DeFi positions
  // Use Number() to ensure proper parsing and fallback to 0 for NaN
  const walletBalanceUsd = walletsWithBalance?.reduce(
    (sum, w) => sum + (Number(w.total_balance_usd) || 0),
    0
  ) || 0

  const defiBalanceUsd = defiPositions?.reduce(
    (sum, d) => sum + (Number(d.total_value_usd) || 0),
    0
  ) || 0

  const cryptoBalanceUsd = walletBalanceUsd + defiBalanceUsd

  // Convert USD to JPY for display
  // rates.USD is the JPY-to-USD rate (~0.00667), so we need 1/rate to get USD-to-JPY (~150)
  const usdToJpyRate = 1 / (Number(rates?.USD) || 0.00667)
  const cryptoBalanceJpy = Math.round(cryptoBalanceUsd * usdToJpyRate) || 0

  // Calculate totals
  const assets = accounts?.filter(a => ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + a.current_balance, 0) || 0

  const liabilities = accounts?.filter(a => !ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + Math.abs(a.current_balance), 0) || 0

  // Add crypto to total assets
  const totalAssets = assets + cryptoBalanceJpy
  const netWorth = totalAssets - liabilities

  // Memoized formatter for CountUp
  const currencyFormatter = useMemo(
    () => (value: number) => formatCurrencyPrivacy(value, currency, rates, false, isPrivacyMode),
    [currency, rates, isPrivacyMode]
  )

  return (
    <div
      className="mb-6 cursor-pointer group"
      onClick={() => setShowBreakdown(!showBreakdown)}
    >
      <Card
        variant="gradient"
        className="relative overflow-hidden group-hover:shadow-lg transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="p-2 rounded-full bg-primary-100 dark:bg-primary-900/30">
              <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('dashboard.netWorth', 'Net Worth')}
            </p>
          </div>
          <p className={cn(
            'text-4xl sm:text-5xl font-bold font-numbers tracking-tight text-center',
            netWorth >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-expense-600 dark:text-expense-300'
          )}>
            <CountUp
              end={netWorth}
              duration={1200}
              formatter={currencyFormatter}
            />
          </p>

          {monthlyNet !== undefined && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                monthlyNet >= 0
                  ? 'bg-income-100 text-income-600 dark:bg-income-900/30 dark:text-income-300'
                  : 'bg-expense-100 text-expense-600 dark:bg-expense-900/30 dark:text-expense-300'
              )}>
                {monthlyNet >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span className="font-numbers">
                  {monthlyNet >= 0 ? '+' : ''}{formatCurrencyPrivacy(monthlyNet, currency, rates, false, isPrivacyMode)}
                </span>
              </div>
              {monthlyNetChange !== undefined && monthlyNetChange !== null && (
                <div className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                  monthlyNetChange > 0
                    ? 'bg-income-100 text-income-600 dark:bg-income-900/30 dark:text-income-300'
                    : monthlyNetChange < 0
                      ? 'bg-expense-100 text-expense-600 dark:bg-expense-900/30 dark:text-expense-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                )}>
                  {monthlyNetChange > 0 ? <TrendingUp size={12} /> : monthlyNetChange < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                  <span className="font-numbers">{monthlyNetChange > 0 ? '+' : ''}{monthlyNetChange?.toFixed(0)}%</span>
                </div>
              )}
            </div>
          )}

          {showBreakdown && (
            <div className="mt-5 pt-5 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('dashboard.assets', 'Assets')}</p>
                  <p className="font-semibold font-numbers text-income-600 dark:text-income-300">
                    {formatCurrencyPrivacy(assets, currency, rates, false, isPrivacyMode)}
                  </p>
                </div>
                {cryptoBalanceJpy > 0 && (
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('crypto.totalBalance', 'Crypto')}</p>
                    <p className="font-semibold font-numbers text-purple-600 dark:text-purple-400">
                      {formatCurrencyPrivacy(cryptoBalanceJpy, currency, rates, false, isPrivacyMode)}
                    </p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('dashboard.liabilities', 'Liabilities')}</p>
                  <p className="font-semibold font-numbers text-expense-600 dark:text-expense-300">
                    -{formatCurrencyPrivacy(liabilities, currency, rates, false, isPrivacyMode)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
