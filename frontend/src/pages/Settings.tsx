import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon, DollarSign, FolderOpen, CreditCard, Tag, RefreshCw, Wallet } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { RecurringTransactionsList } from '@/components/recurring/RecurringTransactionsList'
import { CategoryRulesList } from '@/components/settings/CategoryRulesList'
import { CryptoWalletSettings } from '@/components/settings/CryptoWalletSettings'
import { fetchSettings, updateSettings } from '@/services/settings-service'

export function Settings() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  // Local state for form inputs
  const [currency, setCurrency] = useState<string>('JPY')
  const [baseDate, setBaseDate] = useState<number>(25)
  const [budgetCarryOver, setBudgetCarryOver] = useState<boolean>(false)
  const [budgetEmailAlerts, setBudgetEmailAlerts] = useState<boolean>(true)

  // Sync state with fetched settings
  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency)
      setBaseDate(settings.base_date)
      setBudgetCarryOver(settings.budget_carry_over)
      setBudgetEmailAlerts(settings.budget_email_alerts)
    }
  }, [settings])

  // Mutation for saving settings
  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      alert(t('settings.saveSuccess'))
    },
    onError: (error) => {
      console.error('Failed to save settings:', error)
      alert(t('settings.saveFailed'))
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      currency,
      base_date: baseDate,
      budget_carry_over: budgetCarryOver,
      budget_email_alerts: budgetEmailAlerts,
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('settings.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {/* General Settings */}
        <CollapsibleSection
          title={t('settings.general')}
          icon={<SettingsIcon className="w-5 h-5" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <Select
              label={t('settings.currency')}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'JPY', label: t('settings.currencyJPY') },
                { value: 'USD', label: t('settings.currencyUSD') },
                { value: 'VND', label: t('settings.currencyVND') }
              ]}
            />
            <Input
              type="number"
              label={t('settings.payday')}
              value={baseDate}
              onChange={(e) => setBaseDate(parseInt(e.target.value, 10))}
              min={1}
              max={31}
            />
          </div>
          <div className="mt-6">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('common.loading') : t('settings.saveSettings')}
            </Button>
          </div>
        </CollapsibleSection>

        {/* Budget Settings */}
        <CollapsibleSection
          title={t('settings.budgetSettings')}
          icon={<DollarSign className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="font-medium text-gray-900 dark:text-white">{t('settings.budgetCarryOver')}</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.budgetCarryOverDescription')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={budgetCarryOver}
                  onChange={(e) => setBudgetCarryOver(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <label className="font-medium text-gray-900 dark:text-white">{t('settings.budgetEmailAlerts')}</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.budgetEmailAlertsDescription')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={budgetEmailAlerts}
                  onChange={(e) => setBudgetEmailAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          <div className="mt-6">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('common.loading') : t('settings.saveSettings')}
            </Button>
          </div>
        </CollapsibleSection>

        {/* Categories */}
        <CollapsibleSection
          title={t('settings.categoryManagement')}
          icon={<FolderOpen className="w-5 h-5" />}
          badge={
            settings?.categories?.length ? (
              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                {settings.categories.length}
              </span>
            ) : null
          }
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {settings?.categories?.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100">{cat}</span>
                <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm">{t('settings.delete')}</button>
              </div>
            )) || <p className="text-gray-400 dark:text-gray-500 text-center py-4">{t('settings.noCategories')}</p>}
          </div>
          <div className="mt-4">
            <Button variant="outline">{t('settings.addCategory')}</Button>
          </div>
        </CollapsibleSection>

        {/* Payment Sources */}
        <CollapsibleSection
          title={t('settings.paymentSourceManagement')}
          icon={<CreditCard className="w-5 h-5" />}
          badge={
            settings?.sources?.length ? (
              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                {settings.sources.length}
              </span>
            ) : null
          }
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {settings?.sources?.map((source, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100">{source}</span>
                <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm">{t('settings.delete')}</button>
              </div>
            )) || <p className="text-gray-400 dark:text-gray-500 text-center py-4">{t('settings.noSources')}</p>}
          </div>
          <div className="mt-4">
            <Button variant="outline">{t('settings.addSource')}</Button>
          </div>
        </CollapsibleSection>

        {/* Category Rules */}
        <CategoryRulesList variant="collapsible" />

        {/* Recurring Transactions */}
        <RecurringTransactionsList variant="collapsible" />

        {/* Crypto Wallets */}
        <CryptoWalletSettings variant="collapsible" />
      </div>
    </div>
  )
}
