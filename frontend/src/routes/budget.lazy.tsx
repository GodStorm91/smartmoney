import { createLazyFileRoute } from '@tanstack/react-router'
import { BudgetPage } from '@/pages/Budget'

export const Route = createLazyFileRoute('/budget')({
  component: BudgetPage,
})
