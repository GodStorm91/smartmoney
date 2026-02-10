import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { formatWithCommas, parseFormattedNumber } from '@/utils/form-utils'

interface AmountInputProps {
  value: string
  displayValue: string
  currencySymbol: string
  onChange: (raw: string, display: string) => void
  error?: string
  autoFocus?: boolean
}

export function AmountInput({ value, displayValue, currencySymbol, onChange, error, autoFocus }: AmountInputProps) {
  const { t } = useTranslation('common')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFormattedNumber(e.target.value)
    onChange(rawValue, formatWithCommas(rawValue))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {t('transaction.amount', 'Amount')}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-500 dark:text-gray-400">
          {currencySymbol}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder="0"
          autoFocus={autoFocus}
          className={cn(
            'w-full h-14 pl-10 pr-4 border rounded-lg text-xl text-right font-numbers',
            'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
            error ? 'border-red-500' : 'border-gray-300'
          )}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
