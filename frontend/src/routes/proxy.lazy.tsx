import { createLazyFileRoute } from '@tanstack/react-router'
import { ProxyPage } from '@/pages/Proxy'

export const Route = createLazyFileRoute('/proxy')({
  component: ProxyPage,
})
