import type { AccountWithBalance } from '@/types/account'

export const ASSET_TYPES = ['bank', 'cash', 'investment', 'receivable', 'crypto']

export function convertToJpy(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'JPY' || !rates[currency]) return amount
  const rate = rates[currency]
  if (rate === 0) return amount
  const actual = currency === 'USD' ? amount / 100 : amount
  return Math.round(actual / rate)
}

export function calculateNetWorth(accounts: AccountWithBalance[], rates: Record<string, number>) {
  const assets = accounts
    .filter(a => ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + convertToJpy(a.current_balance, a.currency || 'JPY', rates), 0)
  const liabilities = accounts
    .filter(a => !ASSET_TYPES.includes(a.type))
    .reduce((sum, a) => sum + Math.abs(convertToJpy(a.current_balance, a.currency || 'JPY', rates)), 0)
  return { assets, liabilities, netWorth: assets - liabilities }
}
