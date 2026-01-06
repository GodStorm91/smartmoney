import { createFileRoute } from '@tanstack/react-router'
import Recurring from '@/pages/Recurring'

export const Route = createFileRoute('/recurring')({
  component: Recurring,
})
