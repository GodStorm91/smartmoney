import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAnomalyConfig, updateAnomalyConfig, type AnomalyConfigUpdate } from '@/services/anomaly-service'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { useTranslation } from 'react-i18next'
import { Settings, Save, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'

export function AnomalyConfigPanel() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['anomalyConfig'],
    queryFn: getAnomalyConfig,
  })

  const mutation = useMutation({
    mutationFn: (data: AnomalyConfigUpdate) => updateAnomalyConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalyConfig'] })
    },
  })

  const [formData, setFormData] = useState<AnomalyConfigUpdate>({
    sensitivity: 'medium',
    large_transaction_threshold: 10000,
    unusual_spending_percent: 50,
    recurring_change_percent: 20,
    duplicate_charge_hours: 24,
    enabled_types: ['large_transaction', 'category_shift', 'duplicate'],
  })

  useEffect(() => {
    if (config) {
      setFormData({
        sensitivity: config.sensitivity,
        large_transaction_threshold: config.large_transaction_threshold,
        unusual_spending_percent: config.unusual_spending_percent,
        recurring_change_percent: config.recurring_change_percent,
        duplicate_charge_hours: config.duplicate_charge_hours,
        enabled_types: config.enabled_types || ['large_transaction', 'category_shift', 'duplicate'],
      })
    }
  }, [config])

  const handleSave = () => {
    mutation.mutate(formData)
  }

  const handleTypeToggle = (type: string) => {
    setFormData((prev) => {
      const current = prev.enabled_types || []
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
      return { ...prev, enabled_types: updated }
    })
  }

  const detectionTypes = [
    { key: 'large_transaction', label: t('anomaly.type.large_transaction') },
    { key: 'category_shift', label: t('anomaly.type.category_shift') },
    { key: 'duplicate', label: t('anomaly.type.duplicate') },
    { key: 'recurring_change', label: t('anomaly.type.recurring_change') },
    { key: 'ml_detected', label: t('anomaly.type.ml_detected') },
  ]

  const sensitivityOptions = [
    { value: 'low', label: t('anomaly.config.sensitivityOptions.low') },
    { value: 'medium', label: t('anomaly.config.sensitivityOptions.medium') },
    { value: 'high', label: t('anomaly.config.sensitivityOptions.high') },
  ]

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{t('common.noData')}</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold">{t('anomaly.config.title')}</h3>
      </div>

      <div className="space-y-6">
        <Select
          label={t('anomaly.config.sensitivity')}
          value={formData.sensitivity}
          onChange={(e) => setFormData({ ...formData, sensitivity: e.target.value as 'low' | 'medium' | 'high' })}
          options={sensitivityOptions}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            label={t('anomaly.config.largeTransactionThreshold')}
            value={formData.large_transaction_threshold}
            onChange={(e) => setFormData({ ...formData, large_transaction_threshold: parseInt(e.target.value) || 0 })}
          />
          <Input
            type="number"
            label={t('anomaly.config.unusualSpendingPercent')}
            value={formData.unusual_spending_percent}
            onChange={(e) => setFormData({ ...formData, unusual_spending_percent: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            label={t('anomaly.config.recurringChangePercent')}
            value={formData.recurring_change_percent}
            onChange={(e) => setFormData({ ...formData, recurring_change_percent: parseInt(e.target.value) || 0 })}
          />
          <Input
            type="number"
            label={t('anomaly.config.duplicateChargeHours')}
            value={formData.duplicate_charge_hours}
            onChange={(e) => setFormData({ ...formData, duplicate_charge_hours: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('anomaly.config.enabledTypes')}
          </label>
          <div className="space-y-3">
            {detectionTypes.map((type) => {
              const isEnabled = (formData.enabled_types || []).includes(type.key)
              return (
                <div
                  key={type.key}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {type.label}
                  </span>
                  <Switch
                    checked={isEnabled}
                    onChange={() => handleTypeToggle(type.key)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              {t('common.saving')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {t('anomaly.config.save')}
            </span>
          )}
        </Button>

        {mutation.isSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400 text-center">
            {t('anomaly.config.saved')}
          </p>
        )}
      </div>
    </Card>
  )
}
