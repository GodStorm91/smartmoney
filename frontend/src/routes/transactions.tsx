import { createFileRoute } from '@tanstack/react-router'
import { Transactions } from '@/pages/Transactions'

// Search params schema for budget → transactions navigation
type TransactionsSearch = {
  categories?: string  // Comma-separated list of categories (parent + children)
  month?: string
}

export const Route = createFileRoute('/transactions')({
  component: Transactions,
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => ({
    categories: typeof search.categories === 'string' ? search.categories : undefined,
    month: typeof search.month === 'string' ? search.month : undefined,
  }),
})
