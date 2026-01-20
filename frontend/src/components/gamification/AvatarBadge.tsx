import { useProfile } from '@/services/rewards-service'
import { Link } from '@tanstack/react-router'

export function AvatarBadge() {
  const { data: profile, isLoading } = useProfile()

  if (isLoading || !profile) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    )
  }

  // Get active avatar emoji (use first avatar as default if none selected)
  const activeAvatar = profile.active_avatar
  const avatarEmoji = activeAvatar?.emoji || activeAvatar?.icon || '😊'

  return (
    <Link
      to="/gamification"
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
      title="Your avatar - Click to change"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg leading-none">
        {avatarEmoji}
      </div>
    </Link>
  )
}

export default AvatarBadge
