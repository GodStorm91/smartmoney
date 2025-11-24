import { createFileRoute } from '@tanstack/react-router'
import { BudgetPage } from '@/pages/Budget'

export const Route = createFileRoute('/budget')({
  component: BudgetPage,
})
