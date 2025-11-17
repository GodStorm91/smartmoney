/**
 * Calculate percentage
 * @param value - Current value
 * @param total - Total value
 * @returns Percentage (0-100)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Calculate percentage with decimal
 * @param value - Current value
 * @param total - Total value
 * @param decimals - Number of decimal places
 * @returns Percentage with decimals
 */
export function calculatePercentageDecimal(
  value: number,
  total: number,
  decimals: number = 1
): number {
  if (total === 0) return 0
  return Number(((value / total) * 100).toFixed(decimals))
}

/**
 * Calculate change percentage
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

/**
 * Calculate monthly required amount for goal
 * @param targetAmount - Target amount
 * @param currentAmount - Current saved amount
 * @param monthsRemaining - Months remaining
 * @returns Monthly required amount
 */
export function calculateMonthlyRequired(
  targetAmount: number,
  currentAmount: number,
  monthsRemaining: number
): number {
  if (monthsRemaining <= 0) return 0
  const remaining = targetAmount - currentAmount
  return Math.max(0, Math.ceil(remaining / monthsRemaining))
}

/**
 * Determine goal status based on progress
 * @param currentAmount - Current saved amount
 * @param targetAmount - Target amount
 * @param monthsElapsed - Months elapsed
 * @param totalMonths - Total months for goal
 * @returns Goal status
 */
export function determineGoalStatus(
  currentAmount: number,
  targetAmount: number,
  monthsElapsed: number,
  totalMonths: number
): 'ahead' | 'on-track' | 'behind' | 'achieved' {
  const progress = calculatePercentage(currentAmount, targetAmount)
  const expectedProgress = calculatePercentage(monthsElapsed, totalMonths)

  if (progress >= 100) return 'achieved'
  if (progress >= expectedProgress + 10) return 'ahead'
  if (progress < expectedProgress - 10) return 'behind'
  return 'on-track'
}

/**
 * Sum array of numbers
 * @param numbers - Array of numbers
 * @returns Sum
 */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0)
}

/**
 * Calculate average
 * @param numbers - Array of numbers
 * @returns Average
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return sum(numbers) / numbers.length
}
