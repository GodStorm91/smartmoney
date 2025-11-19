import { createFileRoute } from '@tanstack/react-router'
import Accounts from '@/pages/Accounts'

export const Route = createFileRoute('/accounts')({
  component: Accounts,
})
