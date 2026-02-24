import { useTranslation } from 'react-i18next'

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

const EMOJI_MAP: Record<TimeOfDay, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌇',
  night: '🌙',
}

export function useGreeting(displayName?: string) {
  const { t } = useTranslation('common')
  const timeOfDay = getTimeOfDay()

  const greetingKey = `dashboard.greeting${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}` as const
  const subtitleKey = `dashboard.subtitle${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}` as const

  const greeting = t(greetingKey)
  const subtitle = t(subtitleKey)
  const emoji = EMOJI_MAP[timeOfDay]

  const personalGreeting = displayName && displayName !== 'New User'
    ? `${greeting}, ${displayName}`
    : greeting

  return { greeting: personalGreeting, subtitle, emoji, timeOfDay }
}
