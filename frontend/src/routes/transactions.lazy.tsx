import { createLazyFileRoute } from '@tanstack/react-router'
import { Transactions } from '@/pages/Transactions'

export const Route = createLazyFileRoute('/transactions')({
  component: Transactions,
})
