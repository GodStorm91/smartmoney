import { createFileRoute } from '@tanstack/react-router'

type AnalyticsSearch = {
  tab?: string
}

export const Route = createFileRoute('/analytics')({
  validateSearch: (search: Record<string, unknown>): AnalyticsSearch => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
})
