import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Clock, TrendingUp, Users, Plus } from 'lucide-react'
import { ProxyOutstandingTab } from '@/components/proxy/ProxyOutstandingTab'
import { ProxyHistoryTab } from '@/components/proxy/ProxyHistoryTab'
import { ProxyProfitTab } from '@/components/proxy/ProxyProfitTab'
import { ProxyClientsTab } from '@/components/proxy/ProxyClientsTab'
import { ProxyCartWizard } from '@/components/proxy/ProxyCartWizard'
import { cn } from '@/utils/cn'

type TabId = 'outstanding' | 'history' | 'profit' | 'clients'

export function ProxyPage() {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState<TabId>('outstanding')
  const [showCartWizard, setShowCartWizard] = useState(false)

  const tabs = [
    { id: 'outstanding' as TabId, icon: Clock, label: t('proxy.tabs.outstanding', 'Outstanding') },
    { id: 'history' as TabId, icon: ShoppingCart, label: t('proxy.tabs.history', 'History') },
    { id: 'profit' as TabId, icon: TrendingUp, label: t('proxy.tabs.profit', 'Profit') },
    { id: 'clients' as TabId, icon: Users, label: t('proxy.tabs.clients', 'Clients') },
  ]

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('proxy.pageTitle', 'Proxy Business')}
              </h1>
            </div>
            <button
              onClick={() => setShowCartWizard(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('proxy.newPurchase', 'New Purchase')}</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'text-orange-600 dark:text-orange-400 border-orange-500'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {activeTab === 'outstanding' && <ProxyOutstandingTab />}
        {activeTab === 'history' && <ProxyHistoryTab />}
        {activeTab === 'profit' && <ProxyProfitTab />}
        {activeTab === 'clients' && <ProxyClientsTab />}
      </div>

      {/* Cart Wizard */}
      <ProxyCartWizard
        isOpen={showCartWizard}
        onClose={() => setShowCartWizard(false)}
      />
    </div>
  )
}
