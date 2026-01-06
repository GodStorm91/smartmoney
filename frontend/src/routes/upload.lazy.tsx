import { createLazyFileRoute } from '@tanstack/react-router'
import { Upload } from '@/pages/Upload'

export const Route = createLazyFileRoute('/upload')({
  component: Upload,
})
