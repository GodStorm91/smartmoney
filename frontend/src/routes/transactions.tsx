import { createFileRoute } from '@tanstack/react-router'

// Search params schema for budget/accounts → transactions navigation
type TransactionsSearch = {
  categories?: string  // Comma-separated list of categories (parent + children)
  month?: string
  accountId?: number   // Filter by account ID
  fromAccounts?: boolean  // Show back to accounts button
  type?: 'income' | 'expense'  // Filter by transaction type
}

export const Route = createFileRoute('/transactions')({
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => ({
    categories: typeof search.categories === 'string' ? search.categories : undefined,
    month: typeof search.month === 'string' ? search.month : undefined,
    accountId: typeof search.accountId === 'number' ? search.accountId :
               (typeof search.accountId === 'string' && !isNaN(Number(search.accountId)) ? Number(search.accountId) : undefined),
    fromAccounts: search.fromAccounts === true || search.fromAccounts === 'true',
    type: search.type === 'income' || search.type === 'expense' ? search.type : undefined,
  }),
})
