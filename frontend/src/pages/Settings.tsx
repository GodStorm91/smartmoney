import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('settings.title')}</h2>
        <p className="text-gray-600">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.general')}</h3>
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
        </Card>

        {/* Budget Settings */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.budgetSettings')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="font-medium text-gray-900">{t('settings.budgetCarryOver')}</label>
                <p className="text-sm text-gray-600">{t('settings.budgetCarryOverDescription')}</p>
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
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex-1">
                <label className="font-medium text-gray-900">{t('settings.budgetEmailAlerts')}</label>
                <p className="text-sm text-gray-600">{t('settings.budgetEmailAlertsDescription')}</p>
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
        </Card>

        {/* Categories */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.categoryManagement')}</h3>
          <div className="space-y-2">
            {settings?.categories?.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>{cat}</span>
                <button className="text-red-600 hover:text-red-700 text-sm">{t('settings.delete')}</button>
              </div>
            )) || <p className="text-gray-400 text-center py-4">{t('settings.noCategories')}</p>}
          </div>
          <div className="mt-4">
            <Button variant="outline">{t('settings.addCategory')}</Button>
          </div>
        </Card>

        {/* Payment Sources */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.paymentSourceManagement')}</h3>
          <div className="space-y-2">
            {settings?.sources?.map((source, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>{source}</span>
                <button className="text-red-600 hover:text-red-700 text-sm">{t('settings.delete')}</button>
              </div>
            )) || <p className="text-gray-400 text-center py-4">{t('settings.noSources')}</p>}
          </div>
          <div className="mt-4">
            <Button variant="outline">{t('settings.addSource')}</Button>
          </div>
        </Card>

        {/* Category Rules */}
        <CategoryRulesList />

        {/* Recurring Transactions */}
        <RecurringTransactionsList />

        {/* Crypto Wallets */}
        <CryptoWalletSettings />
      </div>
    </div>
  )
}
