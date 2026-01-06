import { createLazyFileRoute } from '@tanstack/react-router'
import { Analytics } from '@/pages/Analytics'

export const Route = createLazyFileRoute('/analytics')({
  component: Analytics,
})
