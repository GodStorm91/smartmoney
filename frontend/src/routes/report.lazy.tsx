import { createLazyFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/report')({
  component: () => <Navigate to="/analytics" search={{ tab: 'report' }} />,
})
