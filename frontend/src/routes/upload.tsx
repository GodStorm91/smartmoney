import { createFileRoute } from '@tanstack/react-router'
import { Upload } from '@/pages/Upload'

export const Route = createFileRoute('/upload')({
  component: Upload,
})
