import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/services/api-client'

interface UserTheme {
  id: number
  code: string
  name: string
  icon: string
  is_active: boolean
}

interface Theme {
  id: number
  code: string
  name: string
  description: string | null
  type: string
  preview_color: string | null
  icon: string
  unlock_level: number
  is_premium: boolean
}

const DEFAULT_THEME = 'default'
const THEME_STORAGE_KEY = 'smartmoney-theme'

export function useTheme() {
  const [activeTheme, setActiveTheme] = useState<string>(DEFAULT_THEME)
  const [isLoading, setIsLoading] = useState(true)
  const [myThemes, setMyThemes] = useState<UserTheme[]>([])
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([])

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme) {
      setActiveTheme(savedTheme)
      applyTheme(savedTheme)
    }
  }, [])

  // Fetch user's themes from API
  const fetchThemes = useCallback(async () => {
    try {
      setIsLoading(true)
      const [myThemesRes, availableThemesRes] = await Promise.all([
        apiClient.get<UserTheme[]>('/api/rewards/themes/my'),
        apiClient.get<Theme[]>('/api/rewards/themes?level=1'),
      ])

      setMyThemes(myThemesRes.data)
      setAvailableThemes(availableThemesRes.data)

      // Find active theme
      const active = myThemesRes.data.find(t => t.is_active)
      if (active) {
        const themeCode = mapThemeCode(active.code)
        setActiveTheme(themeCode)
        applyTheme(themeCode)
        localStorage.setItem(THEME_STORAGE_KEY, themeCode)
      }
    } catch (error) {
      console.error('Failed to fetch themes:', error)
      // Apply default theme on error
      applyTheme(DEFAULT_THEME)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Apply theme to document
  const applyTheme = useCallback((themeCode: string) => {
    const code = mapThemeCode(themeCode)
    document.documentElement.setAttribute('data-theme', code)
  }, [])

  // Activate a theme
  const activateTheme = useCallback(async (themeId: number) => {
    try {
      await apiClient.post(`/api/rewards/themes/${themeId}/activate`, {})
      const theme = availableThemes.find(t => t.id === themeId)
      if (theme) {
        const themeCode = mapThemeCode(theme.code)
        setActiveTheme(themeCode)
        applyTheme(themeCode)
        localStorage.setItem(THEME_STORAGE_KEY, themeCode)

        // Update my themes list
        setMyThemes(prev => prev.map(t => ({ ...t, is_active: t.id === themeId })))
      }
    } catch (error) {
      console.error('Failed to activate theme:', error)
    }
  }, [availableThemes, applyTheme])

  // Initialize themes on first load
  useEffect(() => {
    fetchThemes()
  }, [fetchThemes])

  return {
    activeTheme,
    isLoading,
    myThemes,
    availableThemes,
    activateTheme,
    refreshThemes: fetchThemes,
  }
}

// Map backend theme codes to CSS theme codes
export function mapThemeCode(code: string): string {
  const codeMap: Record<string, string> = {
    'default': 'default',
    'dark': 'dark',
    'emerald': 'emerald',
    'sunset': 'sunset',
    'purple': 'purple',
    'rainbow': 'rainbow',
    'gold-premium': 'gold-premium',
    'gold_premium': 'gold-premium',
    'neon-night': 'neon-night',
    'neon_night': 'neon-night',
    'rose': 'rose',
  }
  return codeMap[code.toLowerCase()] || 'default'
}

// Get theme display name
export function getThemeDisplayName(code: string): string {
  const nameMap: Record<string, string> = {
    'default': 'Default Blue',
    'dark': 'Dark Gray',
    'emerald': 'Emerald Green',
    'sunset': 'Sunset Orange',
    'purple': 'Royal Purple',
    'rainbow': 'Rainbow',
    'gold-premium': 'Gold Premium',
    'neon-night': 'Neon Night',
    'rose': 'Rose Pink',
  }
  return nameMap[code] || code
}

// Get theme icon
export function getThemeIcon(code: string): string {
  const iconMap: Record<string, string> = {
    'default': '🔵',
    'emerald': '🟢',
    'sunset': '🟠',
    'purple': '🟣',
    'rainbow': '🌈',
    'gold-premium': '🟡',
    'neon-night': '🔵',
    'rose': '🔴',
  }
  return iconMap[code] || '🎨'
}

export default useTheme
