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
      className="group flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
      title="Your avatar - Click to change"
    >
      {/* Accent-colored gradient ring */}
      <div className="relative">
        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center text-lg leading-none">
          {avatarEmoji}
        </div>
      </div>
    </Link>
  )
}

export default AvatarBadge
