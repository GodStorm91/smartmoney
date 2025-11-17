import { createFileRoute } from '@tanstack/react-router'
import { Transactions } from '@/pages/Transactions'

export const Route = createFileRoute('/transactions')({
  component: Transactions,
})
