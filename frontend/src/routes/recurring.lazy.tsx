import { createLazyFileRoute } from '@tanstack/react-router'
import Recurring from '@/pages/Recurring'

export const Route = createLazyFileRoute('/recurring')({
  component: Recurring,
})
