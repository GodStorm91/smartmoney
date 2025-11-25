import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useCreditBalance } from '@/hooks/useCredits'
import { cn } from '@/utils/cn'
import { Coins, AlertTriangle, TrendingUp } from 'lucide-react'

const LOW_BALANCE_THRESHOLD = 1.0
const INSUFFICIENT_THRESHOLD = 0.36 // Average cost of one budget generation

export function CreditBalanceWidget() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: balance, isLoading } = useCreditBalance()

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-32 bg-gray-100 rounded"></div>
      </Card>
    )
  }

  if (!balance) {
    return null
  }

  const isLowBalance = balance.balance < LOW_BALANCE_THRESHOLD
  const isInsufficient = balance.balance < INSUFFICIENT_THRESHOLD

  return (
    <Card className={cn(
      'transition-all',
      isInsufficient && 'border-red-300 bg-red-50',
      isLowBalance && !isInsufficient && 'border-yellow-300 bg-yellow-50'
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className={cn(
              'h-5 w-5',
              isInsufficient ? 'text-red-600' : isLowBalance ? 'text-yellow-600' : 'text-blue-600'
            )} />
            <h3 className="text-sm font-medium text-gray-700">
              {t('credits.balance', 'Credit Balance')}
            </h3>
          </div>
        </div>

        {/* Balance Display */}
        <div className="text-center">
          <p className={cn(
            'text-3xl font-bold font-numbers',
            isInsufficient ? 'text-red-600' : isLowBalance ? 'text-yellow-600' : 'text-blue-600'
          )}>
            {balance.balance.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('credits.available', 'credits available')}
          </p>
        </div>

        {/* Warning Messages */}
        {isInsufficient && (
          <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-800">
                {t('credits.insufficient', 'Insufficient credits')}
              </p>
              <p className="text-red-700 mt-1">
                {t('credits.insufficientMessage', 'You need at least 0.36 credits to generate a budget. Please purchase more credits to continue.')}
              </p>
            </div>
          </div>
        )}

        {isLowBalance && !isInsufficient && (
          <div className="flex items-start gap-2 p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">
                {t('credits.lowBalance', 'Low balance')}
              </p>
              <p className="text-yellow-700 mt-1">
                {t('credits.lowBalanceMessage', 'Your credit balance is running low. Consider purchasing more credits soon.')}
              </p>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">
              {t('credits.lifetimePurchased', 'Purchased')}
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold font-numbers text-gray-900">
                {balance.lifetime_purchased.toFixed(2)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">
              {t('credits.lifetimeSpent', 'Spent')}
            </p>
            <p className="text-sm font-semibold font-numbers text-gray-900">
              {balance.lifetime_spent.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => navigate({ to: '/register' })}
          className="w-full"
          variant={isInsufficient ? 'primary' : 'outline'}
        >
          {t('credits.buyMore', 'Buy More Credits')}
        </Button>
      </div>
    </Card>
  )
}
