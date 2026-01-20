import { createLazyFileRoute } from '@tanstack/react-router'
import ProfilePage from '@/components/gamification/ProfilePage'

export const Route = createLazyFileRoute('/profile')({
  component: ProfilePage,
})
