import { useState } from 'react'
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

interface BudgetGenerateFormProps {
  onGenerate: (income: number) => void
  isLoading: boolean
  error: boolean
}

export function BudgetGenerateForm({ onGenerate, isLoading, error }: BudgetGenerateFormProps) {
  const { t } = useTranslation('common')
  const { currency } = useSettings()
  const [monthlyIncome, setMonthlyIncome] = useState('')

  const currencySymbol = getCurrencySymbol(currency)
  const currencyPosition = getCurrencyPosition(currency)
  const decimalPlaces = getCurrencyDecimals(currency)

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

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">{t('budget.generateTitle')}</h3>
      <p className="text-gray-600 mb-6">{t('budget.generateDescription')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <p className="text-sm text-gray-500 mt-1">{t('budget.incomeHint')}</p>
        </div>

        <Button type="submit" disabled={isLoading || !monthlyIncome} className="w-full">
          {isLoading ? t('budget.generating') : t('budget.generateButton')}
        </Button>

        {error && (
          <p className="text-sm text-red-600 mt-2">{t('budget.generateError')}</p>
        )}
      </form>
    </Card>
  )
}
