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
      className="mb-6 cursor-pointer"
      onClick={() => setShowBreakdown(!showBreakdown)}
    >
      <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div className="text-center py-2">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
          {t('dashboard.netWorth', 'Net Worth')}
        </p>
        <p className={cn(
          'text-4xl sm:text-5xl font-bold font-numbers tracking-tight',
          netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          <CountUp
            end={netWorth}
            duration={1200}
            formatter={currencyFormatter}
          />
        </p>

        {/* Monthly Net Trend Indicator */}
        {monthlyNet !== undefined && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('dashboard.thisMonth', 'This month')}:
            </span>
            <span className={cn(
              'flex items-center gap-1 text-sm font-medium',
              monthlyNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {monthlyNet >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {monthlyNet >= 0 ? '+' : ''}{formatCurrencyPrivacy(monthlyNet, currency, rates, false, isPrivacyMode)}
            </span>
            {monthlyNetChange !== undefined && monthlyNetChange !== null && (
              <span className={cn(
                'flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full',
                monthlyNetChange > 0
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : monthlyNetChange < 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              )}>
                {monthlyNetChange > 0 ? <TrendingUp size={10} /> : monthlyNetChange < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                {monthlyNetChange > 0 ? '+' : ''}{monthlyNetChange?.toFixed(0)}%
              </span>
            )}
          </div>
        )}

        {showBreakdown && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">{t('dashboard.assets', 'Assets')}</span>
              <span className="font-numbers text-green-600 dark:text-green-400">
                {formatCurrencyPrivacy(assets, currency, rates, false, isPrivacyMode)}
              </span>
            </div>
            {cryptoBalanceJpy > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">{t('crypto.totalBalance', 'Crypto')}</span>
                <span className="font-numbers text-purple-600 dark:text-purple-400">
                  {formatCurrencyPrivacy(cryptoBalanceJpy, currency, rates, false, isPrivacyMode)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('dashboard.liabilities', 'Liabilities')}</span>
              <span className="font-numbers text-red-600 dark:text-red-400">
                -{formatCurrencyPrivacy(liabilities, currency, rates, false, isPrivacyMode)}
              </span>
            </div>
          </div>
        )}
        </div>
      </Card>
    </div>
  )
}
