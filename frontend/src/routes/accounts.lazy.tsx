import { createLazyFileRoute } from '@tanstack/react-router'
import Accounts from '@/pages/Accounts'

export const Route = createLazyFileRoute('/accounts')({
  component: Accounts,
})
