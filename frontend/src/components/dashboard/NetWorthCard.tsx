import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { useAccounts } from '@/hooks/useAccounts'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useRatesMap } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'

const ASSET_TYPES = ['bank', 'cash', 'investment', 'receivable']

export function NetWorthCard() {
  const { t } = useTranslation('common')
  const { data: accounts } = useAccounts()
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const rates = useRatesMap()
  const [showBreakdown, setShowBreakdown] = useState(false)

  // Calculate totals
  const assets = accounts?.filter(a => ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + a.current_balance, 0) || 0

  const liabilities = accounts?.filter(a => !ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + Math.abs(a.current_balance), 0) || 0

  const netWorth = assets - liabilities

  return (
    <div
      className="mb-6 cursor-pointer"
      onClick={() => setShowBreakdown(!showBreakdown)}
    >
      <Card className="hover:shadow-md transition-shadow">
        <div className="text-center">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          {t('dashboard.netWorth', 'Net Worth')}
        </p>
        <p className={cn(
          'text-3xl font-bold font-numbers',
          netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          {formatCurrencyPrivacy(netWorth, currency, rates, false, isPrivacyMode)}
        </p>

        {showBreakdown && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-gray-400">{t('dashboard.assets', 'Assets')}</span>
              <span className="font-numbers text-green-600 dark:text-green-400">
                {formatCurrencyPrivacy(assets, currency, rates, false, isPrivacyMode)}
              </span>
            </div>
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
