import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, ChevronRight, Plus, AlertCircle } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { ProxyCartWizard } from './ProxyCartWizard'
import { cn } from '@/utils/cn'

export function ProxyClientsTab() {
  const { t } = useTranslation('common')
  const { data: accounts = [], isLoading } = useAccounts()
  const [showCartWizard, setShowCartWizard] = useState(false)

  // Filter receivable accounts (clients)
  const clientAccounts = accounts.filter(a => a.type === 'receivable')

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    )
  }

  if (clientAccounts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('proxy.noClients', 'No Clients Yet')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {t('proxy.noClientsDesc', 'Create a receivable account to add your first client.')}
        </p>
        <a
          href="/accounts?action=add"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('proxy.addClient', 'Add Client')}
        </a>
      </div>
    )
  }

  return (
    <>
      {/* Client list */}
      <div className="space-y-2">
        {clientAccounts.map(client => {
          const hasBalance = client.current_balance > 0
          const clientName = client.name.replace('Receivable: ', '')

          return (
            <div
              key={client.id}
              className={cn(
                'p-4 rounded-lg transition-colors',
                hasBalance
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  : 'bg-gray-50 dark:bg-gray-800'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
                    hasBalance
                      ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  )}>
                    {clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {clientName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {client.is_active
                        ? t('proxy.activeClient', 'Active')
                        : t('proxy.inactiveClient', 'Inactive')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {hasBalance ? (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-bold">¥{client.current_balance.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-amber-500 dark:text-amber-500">
                        {t('proxy.outstanding', 'Outstanding')}
                      </p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {t('proxy.allSettled', 'All settled')}
                      </span>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {t('proxy.totalClients', 'Total Clients')}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {clientAccounts.length}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-500 dark:text-gray-400">
            {t('proxy.withOutstanding', 'With Outstanding Balance')}
          </span>
          <span className="font-medium text-amber-600 dark:text-amber-400">
            {clientAccounts.filter(c => c.current_balance > 0).length}
          </span>
        </div>
      </div>

      {/* Add client link */}
      <div className="mt-4 text-center">
        <a
          href="/accounts?action=add"
          className="inline-flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 hover:underline"
        >
          <Plus className="w-4 h-4" />
          {t('proxy.addNewClient', 'Add New Client')}
        </a>
      </div>

      {/* Cart Wizard */}
      <ProxyCartWizard
        isOpen={showCartWizard}
        onClose={() => setShowCartWizard(false)}
      />
    </>
  )
}
