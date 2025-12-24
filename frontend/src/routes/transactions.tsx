import { createFileRoute } from '@tanstack/react-router'
import { Transactions } from '@/pages/Transactions'

// Search params schema for budget → transactions navigation
type TransactionsSearch = {
  category?: string
  month?: string
}

export const Route = createFileRoute('/transactions')({
  component: Transactions,
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => ({
    category: typeof search.category === 'string' ? search.category : undefined,
    month: typeof search.month === 'string' ? search.month : undefined,
  }),
})
