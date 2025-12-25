/**
 * Helper functions for goal creation form
 */

export type StartDateOption = 'today' | 'month_start' | 'custom'

export interface GoalFormErrors {
  years?: string
  targetAmount?: string
  customDate?: string
}

/**
 * Validate goal form inputs
 * Returns i18n keys for error messages, not hardcoded strings
 */
export function validateGoalForm(
  years: number,
  targetAmount: string,
  startDateOption: StartDateOption,
  customDate: string,
  preselectedYears?: number
): GoalFormErrors {
  const errors: GoalFormErrors = {}

  // Years validation (only if not preselected)
  if (!preselectedYears) {
    if (years < 1 || years > 10) {
      errors.years = 'goals.errors.yearsRange'
    }
  }

  // Target amount validation - remove both commas and periods
  const amount = parseInt(targetAmount.replace(/[,.\s]/g, ''), 10)
  if (!targetAmount || isNaN(amount)) {
    errors.targetAmount = 'goals.errors.amountRequired'
  } else if (amount < 10000) {
    errors.targetAmount = 'goals.errors.amountMinimum'
  }

  // Custom date validation
  if (startDateOption === 'custom' && !customDate) {
    errors.customDate = 'goals.errors.dateRequired'
  }

  return errors
}

/**
 * Calculate start date based on selected option
 */
export function calculateStartDate(
  option: StartDateOption,
  customDate: string
): string {
  if (option === 'today') {
    return new Date().toISOString().split('T')[0]
  } else if (option === 'month_start') {
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return nextMonth.toISOString().split('T')[0]
  } else {
    return customDate
  }
}

/**
 * Format number input with thousand separators
 * Always uses comma as thousand separator for consistency across locales
 */
export function formatAmountInput(value: string, _locale: string = 'ja-JP'): string {
  // Remove both commas and periods (thousand separators vary by locale)
  const cleanValue = value.replace(/[,.\s]/g, '')
  if (!/^\d*$/.test(cleanValue)) return value
  // Always use en-US locale for consistent comma separator
  return cleanValue ? parseInt(cleanValue, 10).toLocaleString('en-US') : ''
}
