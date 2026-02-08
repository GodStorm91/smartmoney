import { createLazyFileRoute } from '@tanstack/react-router'
import { MonthlyReport } from '@/pages/MonthlyReport'

export const Route = createLazyFileRoute('/report')({
  component: MonthlyReport,
})
