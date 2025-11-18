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
      errors.years = '期間は1年から10年の間で設定してください'
    }
  }

  // Target amount validation
  const amount = parseInt(targetAmount.replace(/,/g, ''), 10)
  if (!targetAmount || isNaN(amount)) {
    errors.targetAmount = '目標金額を入力してください'
  } else if (amount < 10000) {
    errors.targetAmount = '目標金額は¥10,000以上で設定してください'
  }

  // Custom date validation
  if (startDateOption === 'custom' && !customDate) {
    errors.customDate = '開始日を選択してください'
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
 */
export function formatAmountInput(value: string): string {
  const cleanValue = value.replace(/,/g, '')
  if (!/^\d*$/.test(cleanValue)) return value
  return cleanValue ? parseInt(cleanValue, 10).toLocaleString('ja-JP') : ''
}
