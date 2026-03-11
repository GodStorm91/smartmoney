/**
 * Investments Page - Portfolio summary + holdings list
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { HoldingCard } from '@/components/holdings/HoldingCard'
import { AddHoldingModal } from '@/components/holdings/AddHoldingModal'
import { HoldingDetailModal } from '@/components/holdings/HoldingDetailModal'
import { fetchHoldings, fetchPortfolioSummary } from '@/services/holding-service'
import { useSettings } from '@/contexts/SettingsContext'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { formatCurrencyPrivacy } from '@/utils/formatCurrency'
import { cn } from '@/utils/cn'
import type { Holding } from '@/types/holding'

export default function Investments() {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const { isPrivacyMode } = usePrivacy()
  const { data: exchangeRates } = useExchangeRates()

  const rates = exchangeRates?.rates || {}

  const fmtDisplay = (amount: number) =>
    formatCurrencyPrivacy(amount, currency, rates, false, isPrivacyMode)

  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const { data: holdings, isLoading } = useQuery({
    queryKey: ['holdings'],
    queryFn: () => fetchHoldings(),
  })

  const { data: summary } = useQuery({
    queryKey: ['holdings-summary'],
    queryFn: fetchPortfolioSummary,
    enabled: !!holdings?.length,
  })

  const handleHoldingClick = (holding: Holding) => {
    setSelectedHolding(holding)
    setIsDetailOpen(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('holdings.title', 'Investments')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('holdings.subtitle', 'Track your investment portfolio')}
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-5 h-5" />
          {t('holdings.add', 'Add Holding')}
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!holdings || holdings.length === 0) && (
        <Card>
          <EmptyState
            icon={<TrendingUp />}
            title={t('holdings.noHoldings', 'No holdings yet')}
            description={t('holdings.noHoldingsDesc', 'Start tracking your investments')}
            action={
              <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4" />
                {t('holdings.add', 'Add Holding')}
              </Button>
            }
          />
        </Card>
      )}

      {/* Portfolio Summary */}
      {!isLoading && holdings && holdings.length > 0 && summary && (
        <Card className="mb-6">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('holdings.portfolioTotal', 'Portfolio Total')}
          </p>
          <p className="text-2xl font-bold font-numbers tracking-tight text-gray-900 dark:text-white">
            {fmtDisplay(summary.total_value)}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold font-numbers',
              summary.total_pnl >= 0
                ? 'bg-income-100 text-income-700 dark:bg-income-900/30 dark:text-income-300'
                : 'bg-expense-100 text-expense-700 dark:bg-expense-900/30 dark:text-expense-300'
            )}>
              {summary.total_pnl >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {summary.total_pnl >= 0 ? '+' : ''}{fmtDisplay(summary.total_pnl)}
              {' '}({summary.total_pnl >= 0 ? '+' : ''}{summary.pnl_percentage.toFixed(1)}%)
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-numbers mt-1.5">
            {t('holdings.costBasis', 'Cost Basis')}: {fmtDisplay(summary.total_cost)}
          </p>
        </Card>
      )}

      {/* Holdings list */}
      {!isLoading && holdings && holdings.length > 0 && (
        <div className="space-y-3">
          {holdings.map((holding, idx) => (
            <HoldingCard
              key={holding.id}
              holding={holding}
              onClick={() => handleHoldingClick(holding)}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <AddHoldingModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
      {isDetailOpen && selectedHolding && (
        <HoldingDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false)
            setSelectedHolding(null)
          }}
          holding={selectedHolding}
        />
      )}
    </div>
  )
}
