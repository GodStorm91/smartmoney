import { createLazyFileRoute } from '@tanstack/react-router'
import { BenchmarkComparison } from '@/pages/BenchmarkComparison'

export const Route = createLazyFileRoute('/benchmark')({
  component: BenchmarkComparison,
})
