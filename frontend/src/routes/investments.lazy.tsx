import { createLazyFileRoute } from '@tanstack/react-router'
import Investments from '@/pages/Investments'

export const Route = createLazyFileRoute('/investments')({
  component: Investments,
})
