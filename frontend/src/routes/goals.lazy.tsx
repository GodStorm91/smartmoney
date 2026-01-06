import { createLazyFileRoute } from '@tanstack/react-router'
import { Goals } from '@/pages/Goals'

export const Route = createLazyFileRoute('/goals')({
  component: Goals,
})
