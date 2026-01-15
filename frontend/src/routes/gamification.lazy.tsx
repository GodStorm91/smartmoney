import { createLazyFileRoute } from '@tanstack/react-router'
import GamificationPage from '@/pages/Gamification'

export const Route = createLazyFileRoute('/gamification')({
  component: GamificationPage,
})
