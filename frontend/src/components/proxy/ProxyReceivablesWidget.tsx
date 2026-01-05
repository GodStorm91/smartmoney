import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Plus, Users } from 'lucide-react'
import { getOutstandingReceivables, type OutstandingClient } from '@/services/proxy-service'
import { Card } from '@/components/ui/Card'
import { ProxyPurchaseWizard } from './ProxyPurchaseWizard'
import { ProxySettlementModal } from './ProxySettlementModal'

export function ProxyReceivablesWidget() {
  const { t } = useTranslation('common')
  const [showPurchaseWizard, setShowPurchaseWizard] = useState(false)
  const [settlingClient, setSettlingClient] = useState<OutstandingClient | null>(null)

  const { data: outstanding = [], isLoading } = useQuery({
    queryKey: ['proxy-outstanding'],
    queryFn: getOutstandingReceivables,
  })

  // Calculate total
  const totalJpy = outstanding.reduce((sum, c) => sum + c.total_jpy, 0)

  // Calculate days since oldest
  const getDaysAgo = (dateStr: string | null): number => {
    if (!dateStr) return 0
    const date = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </Card>
    )
  }

  // Don't show widget if no outstanding receivables
  if (outstanding.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">{t('proxy.outstandingReceivables')}</h3>
          </div>
          <button
            onClick={() => setShowPurchaseWizard(true)}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
          >
            <Plus className="w-4 h-4" />
            {t('proxy.newPurchase')}
          </button>
        </div>

        {/* Client list */}
        <div className="space-y-2">
          {outstanding.map(client => {
            const daysAgo = getDaysAgo(client.oldest_date)
            return (
              <button
                key={client.client_id}
                onClick={() => setSettlingClient(client)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div>
                  <p className="font-medium">{client.client_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {client.item_count} {t('proxy.items')}
                    {daysAgo > 0 && ` • ${t('proxy.oldestDays', { days: daysAgo })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-mono font-semibold">¥{client.total_jpy.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">₫{client.total_vnd.toLocaleString()}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('proxy.total')}:</span>
            <span className="font-bold">¥{totalJpy.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <ProxyPurchaseWizard
        isOpen={showPurchaseWizard}
        onClose={() => setShowPurchaseWizard(false)}
      />
      <ProxySettlementModal
        isOpen={!!settlingClient}
        onClose={() => setSettlingClient(null)}
        client={settlingClient}
      />
    </>
  )
}
