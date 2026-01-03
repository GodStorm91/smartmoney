import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { createGoal, updateGoal, fetchGoal, hasEmergencyFund } from '@/services/goal-service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StartDateSelector } from './StartDateSelector'
import { GoalTypeSelector } from './GoalTypeSelector'
import {
  validateGoalForm,
  calculateStartDate,
  formatAmountInput,
  type StartDateOption,
  type GoalFormErrors,
} from './goal-form-helpers'
import type { GoalType, GoalCreate, GoalUpdate, GoalCurrency } from '@/types/goal'

interface GoalCreateModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedYears?: number
  editingGoalId?: number | null
}

export function GoalCreateModal({
  isOpen,
  onClose,
  preselectedYears,
  editingGoalId,
}: GoalCreateModalProps) {
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()

  // Step state (1 = type selection, 2 = details)
  const [step, setStep] = useState(1)

  // Form state
  const [goalType, setGoalType] = useState<GoalType | null>(null)
  const [name, setName] = useState<string>('')
  const [years, setYears] = useState<number>(preselectedYears || 3)
  const [targetAmount, setTargetAmount] = useState<string>('')
  const [startDateOption, setStartDateOption] = useState<StartDateOption>('today')
  const [customDate, setCustomDate] = useState<string>('')
  const [currency, setCurrency] = useState<GoalCurrency>('JPY')
  const [errors, setErrors] = useState<GoalFormErrors>({})
  const [serverError, setServerError] = useState<string>('')

  // Check if user has emergency fund
  const { data: hasEF = true } = useQuery({
    queryKey: ['has-emergency-fund'],
    queryFn: hasEmergencyFund,
    enabled: isOpen && !editingGoalId,
  })

  // Fetch existing goal if editing
  const { data: existingGoal } = useQuery({
    queryKey: ['goal', editingGoalId],
    queryFn: () => fetchGoal(editingGoalId!),
    enabled: !!editingGoalId && isOpen,
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingGoalId && existingGoal) {
        setStep(2) // Skip type selection when editing
        setGoalType(existingGoal.goal_type || 'custom')
        setName(existingGoal.name || '')
        setYears(existingGoal.years)
        // Format with thousands separator based on locale
        const locale = i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'vi' ? 'vi-VN' : 'en-US'
        setTargetAmount(existingGoal.target_amount.toLocaleString(locale))
        if (existingGoal.start_date) {
          setStartDateOption('custom')
          setCustomDate(existingGoal.start_date)
        }
      } else {
        setStep(1)
        setGoalType(null)
        setName('')
        setYears(preselectedYears || 3)
        setTargetAmount('')
        setStartDateOption('today')
        setCustomDate('')
        setCurrency('JPY')
      }
      setErrors({})
      setServerError('')
    }
  }, [isOpen, preselectedYears, editingGoalId, existingGoal])

  // Create/Update goal mutation
  const goalMutation = useMutation({
    mutationFn: async (data: GoalCreate | GoalUpdate) => {
      if (editingGoalId) {
        return updateGoal(editingGoalId, data as GoalUpdate)
      }
      return createGoal(data as GoalCreate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals-progress-full'] })
      queryClient.invalidateQueries({ queryKey: ['has-emergency-fund'] })
      onClose()
    },
    onError: () => {
      setServerError(editingGoalId ? t('goals.errors.updateFailed') : t('goals.errors.createFailed'))
    },
  })

  const handleTypeSelect = (type: GoalType) => {
    setGoalType(type)
    // Auto-set name based on type
    if (!name) {
      setName(t(`goals.types.${type}`))
    }
    setStep(2)
  }

  // Format minimum amount based on selected currency
  const getMinAmountFormatted = () => {
    const minAmount = 10000
    switch (currency) {
      case 'JPY':
        return `¥${minAmount.toLocaleString()}`
      case 'USD':
        return `$${minAmount.toLocaleString()}`
      case 'VND':
        return `${minAmount.toLocaleString()}₫`
      default:
        return minAmount.toLocaleString()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const rawErrors = validateGoalForm(years, targetAmount, startDateOption, customDate, preselectedYears)
    // Translate error keys to localized messages
    const translatedErrors: GoalFormErrors = {}
    for (const [key, value] of Object.entries(rawErrors)) {
      if (value) {
        // Pass dynamic amount for amountMinimum error
        if (value === 'goals.errors.amountMinimum') {
          translatedErrors[key as keyof GoalFormErrors] = t(value, { amount: getMinAmountFormatted() })
        } else {
          translatedErrors[key as keyof GoalFormErrors] = t(value)
        }
      }
    }
    if (Object.keys(translatedErrors).length > 0) {
      setErrors(translatedErrors)
      return
    }

    const amount = parseInt(targetAmount.replace(/[,.\s]/g, ''), 10)
    const startDate = calculateStartDate(startDateOption, customDate)

    if (editingGoalId) {
      goalMutation.mutate({ name: name || undefined, target_amount: amount, start_date: startDate || undefined })
    } else {
      goalMutation.mutate({
        goal_type: goalType || 'custom',
        name: name || undefined,
        target_amount: amount,
        currency,
        years,
        start_date: startDate || undefined,
      })
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get locale for number formatting
    const locale = i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'vi' ? 'vi-VN' : 'en-US'
    setTargetAmount(formatAmountInput(e.target.value, locale))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {editingGoalId ? t('goals.modal.editTitle') : step === 1 ? t('goals.modal.createTitle') : t(`goals.types.${goalType}`)}
          </h2>
          {!editingGoalId && step === 2 && (
            <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline mt-1">
              ← {t('common.back')}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && !editingGoalId ? (
            <GoalTypeSelector selectedType={goalType} onSelect={handleTypeSelect} hasEmergencyFund={hasEF} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={t('goals.form.name')}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('goals.form.namePlaceholder')}
              />

              {!preselectedYears && !editingGoalId && (
                <Input
                  label={t('goals.form.years')}
                  type="number"
                  min={1}
                  max={10}
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value, 10) || 1)}
                  error={errors.years}
                  required
                />
              )}

              {/* Currency and Amount row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('goals.form.currency')}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as GoalCurrency)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={!!editingGoalId}
                  >
                    <option value="JPY">{t('currency.JPY')}</option>
                    <option value="USD">{t('currency.USD')}</option>
                    <option value="VND">{t('currency.VND')}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Input
                    label={t('goals.form.targetAmount')}
                    type="text"
                    value={targetAmount}
                    onChange={handleAmountChange}
                    error={errors.targetAmount}
                    placeholder={t('goals.form.targetAmountPlaceholder')}
                    required
                  />
                </div>
              </div>

              <StartDateSelector
                selectedOption={startDateOption}
                customDate={customDate}
                customDateError={errors.customDate}
                onOptionChange={setStartDateOption}
                onCustomDateChange={setCustomDate}
              />

              {serverError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-300">{serverError}</div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={goalMutation.isPending}>
            {t('common.cancel')}
          </Button>
          {step === 2 && (
            <Button variant="primary" onClick={handleSubmit} disabled={goalMutation.isPending || !targetAmount}>
              {goalMutation.isPending ? t('goals.modal.creating') : editingGoalId ? t('goals.modal.update') : t('goals.modal.create')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
