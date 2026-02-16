import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/benchmark')({
  validateSearch: (search: Record<string, unknown>) => ({
    // No search params for now
  }),
})
