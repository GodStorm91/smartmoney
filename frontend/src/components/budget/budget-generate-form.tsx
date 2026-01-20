import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useSettings } from '@/contexts/SettingsContext'
import {
  formatNumberWithSeparators,
  parseFormattedNumber,
  getCurrencySymbol,
  getCurrencyPosition,
  getCurrencyDecimals,
} from '@/utils/formatNumber'
import type { BudgetSuggestions } from '@/types'

interface BudgetGenerateFormProps {
  onGenerate: (income: number) => void
  isLoading: boolean
  error: boolean
  suggestions?: BudgetSuggestions
}

export function BudgetGenerateForm({ onGenerate, isLoading, error, suggestions }: BudgetGenerateFormProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [hasPreFilled, setHasPreFilled] = useState(false)

  const currencySymbol = getCurrencySymbol(currency)
  const currencyPosition = getCurrencyPosition(currency)
  const decimalPlaces = getCurrencyDecimals(currency)

  // Pre-fill income from previous month when suggestions load
  useEffect(() => {
    if (suggestions?.previous_income && !hasPreFilled && !monthlyIncome) {
      const displayValue = suggestions.previous_income / Math.pow(10, decimalPlaces)
      setMonthlyIncome(formatNumberWithSeparators(displayValue, decimalPlaces))
      setHasPreFilled(true)
    }
  }, [suggestions, hasPreFilled, monthlyIncome, decimalPlaces])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Remove all non-numeric characters except decimal point
    const cleaned = inputValue.replace(/[^\d.]/g, '')

    // Parse and format with thousand separators
    if (cleaned) {
      const numValue = parseFloat(cleaned)
      if (!isNaN(numValue)) {
        setMonthlyIncome(formatNumberWithSeparators(numValue, decimalPlaces))
      }
    } else {
      setMonthlyIncome('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Parse formatted number back to numeric value
    const numericValue = parseFormattedNumber(monthlyIncome)

    // Convert to cents/smallest unit for decimal currencies
    // JPY/VND are stored as-is, USD/EUR stored in cents
    const incomeAmount = Math.round(numericValue * Math.pow(10, decimalPlaces))

    if (incomeAmount > 0) {
      onGenerate(incomeAmount)
      setMonthlyIncome('')
    }
  }

  const handleClonePrevious = () => {
    if (suggestions?.previous_income) {
      onGenerate(suggestions.previous_income)
    }
  }

  // Format previous month for display (e.g., "2025-12" -> "December 2025")
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Clone previous month option */}
      {suggestions?.has_previous && suggestions.previous_month && (
        <Card className="p-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                {t('budget.previousBudgetFound', { month: formatMonth(suggestions.previous_month) })}
              </h4>
              <p className="text-sm text-blue-600 dark:text-blue-300 mb-3">
                {t('budget.cloneDescription')}
              </p>
              <Button
                onClick={handleClonePrevious}
                loading={isLoading}
                className="w-full sm:w-auto"
              >
                {t('budget.clonePreviousMonth')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Divider when clone option is shown */}
      {suggestions?.has_previous && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
              {t('budget.orCreateNew')}
            </span>
          </div>
        </div>
      )}

      {/* Original form */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('budget.generateTitle')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{t('budget.generateDescription')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('budget.monthlyIncome')}
            </label>
            <div className="relative">
              {currencyPosition === 'prefix' && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm font-medium">{currencySymbol}</span>
                </div>
              )}
              <Input
                type="text"
                inputMode="decimal"
                value={monthlyIncome}
                onChange={handleInputChange}
                placeholder={formatNumberWithSeparators(500000, decimalPlaces)}
                required
                disabled={isLoading}
                className={
                  currencyPosition === 'prefix'
                    ? 'pl-8'
                    : 'pr-10'
                }
              />
              {currencyPosition === 'suffix' && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm font-medium">{currencySymbol}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('budget.incomeHint')}
              {suggestions?.previous_income && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  ({t('budget.previousIncome')}: {currencySymbol}{formatNumberWithSeparators(
                    suggestions.previous_income / Math.pow(10, decimalPlaces),
                    decimalPlaces
                  )})
                </span>
              )}
            </p>
          </div>

          <Button type="submit" loading={isLoading} disabled={!monthlyIncome} className="w-full">
            {t('budget.generateButton')}
          </Button>

          {error && (
            <p className="text-sm text-red-600 mt-2">{t('budget.generateError')}</p>
          )}
        </form>
      </Card>
    </div>
  )
}
