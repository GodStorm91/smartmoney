import { createLazyFileRoute } from '@tanstack/react-router'
import { RelocationPage } from '@/pages/RelocationPage'

export const Route = createLazyFileRoute('/relocation')({
  component: RelocationPage,
})
